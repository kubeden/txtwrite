export function repoContext() {
  const [owner, repo] = (process.env.GITHUB_REPOSITORY ?? "").split("/");
  if (!owner || !repo) {
    throw new Error("GITHUB_REPOSITORY must be set as owner/repo.");
  }
  return { owner, repo };
}

export async function githubRequest(path, options = {}) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is required.");

  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "x-github-api-version": "2022-11-28",
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(options.headers ?? {})
    }
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = data?.message ?? response.statusText;
    throw new Error(`GitHub API ${response.status}: ${message}`);
  }
  return data;
}

export async function fetchIssue(issueNumber) {
  const { owner, repo } = repoContext();
  return githubRequest(`/repos/${owner}/${repo}/issues/${issueNumber}`);
}

export async function fetchPullRequest(pullNumber) {
  const { owner, repo } = repoContext();
  return githubRequest(`/repos/${owner}/${repo}/pulls/${pullNumber}`);
}

export async function fetchIssueComments(issueNumber) {
  const { owner, repo } = repoContext();
  return githubRequest(`/repos/${owner}/${repo}/issues/${issueNumber}/comments?per_page=100`);
}

export async function createIssueComment(issueNumber, body) {
  const { owner, repo } = repoContext();
  return githubRequest(`/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
    method: "POST",
    body: JSON.stringify({ body })
  });
}

export async function findOpenPullByHead(headBranch) {
  const { owner, repo } = repoContext();
  const head = `${owner}:${headBranch}`;
  const pulls = await githubRequest(
    `/repos/${owner}/${repo}/pulls?state=open&head=${encodeURIComponent(head)}`
  );
  return pulls[0] ?? null;
}

export async function createPullRequest({ title, body, head, base, draft = true }) {
  const { owner, repo } = repoContext();
  return githubRequest(`/repos/${owner}/${repo}/pulls`, {
    method: "POST",
    body: JSON.stringify({ title, body, head, base, draft })
  });
}

export async function addIssueLabels(issueNumber, labels) {
  if (!labels.length) return null;
  const { owner, repo } = repoContext();
  try {
    return await githubRequest(`/repos/${owner}/${repo}/issues/${issueNumber}/labels`, {
      method: "POST",
      body: JSON.stringify({ labels })
    });
  } catch (error) {
    console.warn(`Could not add labels: ${error.message}`);
    return null;
  }
}
