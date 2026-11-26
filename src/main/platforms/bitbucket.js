// US-1201 AC-1: Bitbucket Cloud pull requests, approvals and comments in the common shape. `api(endpoint)` calls the
// REST API with the saved username and app password (platforms/index.js). Only the first page of each list is read.
const asList = (value) => (Array.isArray(value) ? value : []); // a reply that is not a list reads as an empty one
const repo = (p) => `repositories/${p.path}`;
const values = (res) => asList(res?.values);

/** US-1201 AC-1: the open pull requests with the files each one changes. */
export async function pulls(api, p) {
  // ponytail: one page (50 pulls, 100 files each); follow `next` if a team keeps more open.
  const list = values(await api(`${repo(p)}/pullrequests?state=OPEN&pagelen=50`));
  return Promise.all(
    list.map(async (pr) => ({
      number: pr.id,
      title: pr.title ?? '',
      branch: pr.source?.branch?.name ?? null,
      author: pr.author?.display_name ?? null,
      url: pr.links?.html?.href ?? null,
      files: values(await api(`${repo(p)}/pullrequests/${pr.id}/diffstat?pagelen=100`)).map((d) => d.new?.path ?? d.old?.path)
    }))
  );
}

/** US-1201 AC-1, AC-4: the comments of one pull request; deleted ones are left out. */
// US-1203: an inline comment is a thread under its first comment (followed up the `parent` links), with that comment's
// file, line and `resolution`.
export async function comments(api, p, number) {
  const list = values(await api(`${repo(p)}/pullrequests/${number}/comments?pagelen=100`));
  const byId = new Map(list.map((c) => [c.id, c]));
  const rootOf = (c) => {
    for (let seen = 0; c.parent && byId.has(c.parent.id) && seen < list.length; seen++) c = byId.get(c.parent.id);
    return c;
  };
  return list
    .filter((c) => !c.deleted)
    .map((c) => {
      const root = rootOf(c);
      const thread = root.inline
        ? { id: root.id, path: root.inline.path ?? null, line: root.inline.to ?? root.inline.from ?? null, resolved: !!root.resolution }
        : null;
      const row = { author: c.user?.display_name ?? null, body: c.content?.raw ?? '', time: c.created_on ?? null, url: c.links?.html?.href ?? null };
      return thread ? { ...row, thread } : row;
    });
}

/** US-1201 AC-1, AC-4: the participants who approved or asked for changes. */
export async function reviews(api, p, number) {
  const pr = (await api(`${repo(p)}/pullrequests/${number}`)) ?? {};
  return asList(pr.participants)
    .filter((x) => x.approved || x.state === 'changes_requested')
    .map((x) => ({ author: x.user?.display_name ?? null, state: x.approved ? 'approved' : 'changes', time: x.participated_on ?? null, body: '', url: null }));
}

/**
 * US-1304 FR5.1, FR5.3: the merged pull requests into the main branch as {number, createdAt, mergedAt, changes}; review
 * rounds are not kept, so `changes` is null. ponytail: one page of 50, and `updated_on` stands in for the merge time
 * (Bitbucket has no merged_on); read the merge commit's date if later edits skew it.
 */
export async function merged(api, p) {
  const main = (await api(repo(p)))?.mainbranch?.name;
  return values(await api(`${repo(p)}/pullrequests?state=MERGED&pagelen=50`))
    .filter((pr) => pr.destination?.branch?.name === main)
    .map((pr) => ({ number: pr.id, createdAt: pr.created_on ?? null, mergedAt: pr.updated_on ?? null, changes: null }));
}
