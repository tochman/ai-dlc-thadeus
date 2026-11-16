// US-1201 AC-1: GitLab merge requests, approvals and notes in the common shape. `api(endpoint)` runs `glab api` on the
// remote's own host with the person's own `glab` login (platforms/index.js). Only the first page of each list is read.
const asList = (value) => (Array.isArray(value) ? value : []); // a reply that is not a list reads as an empty one
const project = (p) => `projects/${encodeURIComponent(p.path)}`;

/** US-1201 AC-1: the open merge requests with the files each one changes. */
export async function pulls(api, p) {
  // ponytail: one page (50 merge requests, 100 files each); follow X-Next-Page if a team keeps more open.
  const list = asList(await api(`${project(p)}/merge_requests?state=opened&per_page=50`));
  return Promise.all(
    list.map(async (mr) => ({
      number: mr.iid,
      title: mr.title ?? '',
      branch: mr.source_branch ?? null,
      author: mr.author?.username ?? null,
      url: mr.web_url ?? null,
      files: asList(await api(`${project(p)}/merge_requests/${mr.iid}/diffs?per_page=100`)).map((d) => d.new_path ?? d.old_path)
    }))
  );
}

/** US-1201 AC-1, AC-4: the notes people wrote on one merge request; GitLab's own system notes are left out. */
export async function comments(api, p, number) {
  return asList(await api(`${project(p)}/merge_requests/${number}/notes?per_page=100`))
    .filter((n) => !n.system)
    .map((n) => ({ author: n.author?.username ?? null, body: n.body ?? '', time: n.created_at ?? null, url: null }));
}

/** US-1201 AC-1, AC-4: the approvals of one merge request, each at the time the approvals last changed. */
export async function reviews(api, p, number) {
  const res = (await api(`${project(p)}/merge_requests/${number}/approvals`)) ?? {};
  return asList(res.approved_by).map((a) => ({ author: a.user?.username ?? null, state: 'approved', time: res.updated_at ?? null, body: '', url: null }));
}
