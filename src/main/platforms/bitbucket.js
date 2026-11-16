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
export async function comments(api, p, number) {
  return values(await api(`${repo(p)}/pullrequests/${number}/comments?pagelen=100`))
    .filter((c) => !c.deleted)
    .map((c) => ({ author: c.user?.display_name ?? null, body: c.content?.raw ?? '', time: c.created_on ?? null, url: c.links?.html?.href ?? null }));
}

/** US-1201 AC-1, AC-4: the participants who approved or asked for changes. */
export async function reviews(api, p, number) {
  const pr = (await api(`${repo(p)}/pullrequests/${number}`)) ?? {};
  return asList(pr.participants)
    .filter((x) => x.approved || x.state === 'changes_requested')
    .map((x) => ({ author: x.user?.display_name ?? null, state: x.approved ? 'approved' : 'changes', time: x.participated_on ?? null, body: '', url: null }));
}
