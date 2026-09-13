const API = "https://api.github.com";

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export async function githubValidate(token: string) {
  const res = await fetch(`${API}/user`, { headers: headers(token) });
  if (!res.ok) throw new Error(`GitHub token invalid (${res.status})`);
  const user = await res.json();
  return { login: user.login as string };
}

async function searchPRs(token: string, repo: string, extra: string) {
  const q = encodeURIComponent(`repo:${repo} is:pr${extra}`);
  const res = await fetch(`${API}/search/issues?q=${q}&sort=updated&order=desc&per_page=5`, {
    headers: headers(token),
  });
  if (!res.ok) throw new Error(`GitHub search failed (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return (data.items ?? []).map((pr: Record<string, unknown>) => ({
    number: pr.number,
    title: pr.title,
    author: (pr.user as { login?: string } | undefined)?.login,
    updatedAt: pr.updated_at,
    url: pr.html_url,
  }));
}

export async function githubSearchRecentPRs(token: string, repo: string, keyword?: string) {
  if (keyword) {
    const matched = await searchPRs(token, repo, ` ${keyword}`);
    if (matched.length) return matched;
  }
  // No keyword, or nothing matched it — fall back to the most recently updated PRs
  // so the workflow still has real evidence to show instead of an empty result.
  return searchPRs(token, repo, "");
}

export async function githubCreateIssue(
  token: string,
  repo: string,
  title: string,
  body: string
) {
  const res = await fetch(`${API}/repos/${repo}/issues`, {
    method: "POST",
    headers: { ...headers(token), "Content-Type": "application/json" },
    body: JSON.stringify({ title, body }),
  });
  if (!res.ok) throw new Error(`GitHub create issue failed (${res.status}): ${await res.text()}`);
  const issue = await res.json();
  return { number: issue.number as number, url: issue.html_url as string };
}

export async function githubVerifyIssue(token: string, repo: string, number: number) {
  const res = await fetch(`${API}/repos/${repo}/issues/${number}`, { headers: headers(token) });
  if (!res.ok) return false;
  const issue = await res.json();
  return Boolean(issue?.id);
}
