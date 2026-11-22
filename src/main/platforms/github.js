// US-1201 AC-1: GitHub pull requests, reviews and comments in the common shape. `api(endpoint)` runs `gh api` with the
// person's own `gh` login (platforms/index.js). Only the first page of each list is read.
const asList = (value) => (Array.isArray(value) ? value : []); // a reply that is not a list reads as an empty one
const repo = (p) => `repos/${p.path}`;
const STATE = { APPROVED: 'approved', CHANGES_REQUESTED: 'changes' };

/** US-1201 AC-1: the open pull requests with the files each one changes. */
export async function pulls(api, p) {
  // ponytail: one page (50 pulls, 100 files each); follow the Link header if a team keeps more open.
  const list = asList(await api(`${repo(p)}/pulls?state=open&per_page=50`));
  return Promise.all(
    list.map(async (pr) => ({
      number: pr.number,
      title: pr.title ?? '',
      branch: pr.head?.ref ?? null,
      author: pr.user?.login ?? null,
      url: pr.html_url ?? null,
      files: asList(await api(`${repo(p)}/pulls/${pr.number}/files?per_page=100`)).map((f) => f.filename)
    }))
  );
}

// US-1203: REST has no resolved state for review threads, GraphQL has. ponytail: first 50 threads, 50 comments each.
const THREADS =
  'query($owner:String!,$name:String!,$n:Int!){repository(owner:$owner,name:$name){pullRequest(number:$n){reviewThreads(first:50){nodes{id isResolved path line comments(first:50){nodes{author{login} body createdAt url}}}}}}}';

/** US-1203: the review threads of one pull request, each comment with its thread's file, line and resolved state. */
async function threadComments(api, p, number) {
  const [owner, name] = p.path.split('/');
  const res = await api('graphql', ['-f', `query=${THREADS}`, '-f', `owner=${owner}`, '-f', `name=${name}`, '-F', `n=${number}`]);
  return asList(res?.data?.repository?.pullRequest?.reviewThreads?.nodes).flatMap((th) =>
    asList(th.comments?.nodes).map((c) => ({
      author: c.author?.login ?? null,
      body: c.body ?? '',
      time: c.createdAt ?? null,
      url: c.url ?? null,
      thread: { id: th.id, path: th.path ?? null, line: th.line ?? null, resolved: !!th.isResolved }
    }))
  );
}

/** US-1201 AC-1, AC-4: the conversation comments of one pull request; US-1203: then its review-thread comments. */
export async function comments(api, p, number) {
  const [plain, threads] = await Promise.all([api(`${repo(p)}/issues/${number}/comments`), threadComments(api, p, number)]);
  return asList(plain)
    .map((c) => ({ author: c.user?.login ?? null, body: c.body ?? '', time: c.created_at ?? null, url: c.html_url ?? null }))
    .concat(threads);
}

/** US-1201 AC-1, AC-4: the reviews of one pull request. */
export async function reviews(api, p, number) {
  return asList(await api(`${repo(p)}/pulls/${number}/reviews`)).map((r) => ({
    author: r.user?.login ?? null,
    state: STATE[r.state] ?? 'commented',
    time: r.submitted_at ?? null,
    body: r.body ?? '',
    url: r.html_url ?? null
  }));
}
