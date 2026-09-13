const AUTH_API = "https://api.atlassian.com";

export interface JiraAuth {
  /** REST API base, e.g. https://api.atlassian.com/ex/jira/{cloudId}/rest/api/3 (OAuth) or https://yoursite.atlassian.net/rest/api/3 (API token) */
  baseUrl: string;
  authHeader: string;
}

function oauthHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, Accept: "application/json" };
}

export async function jiraAccessibleResources(token: string) {
  const res = await fetch(`${AUTH_API}/oauth/token/accessible-resources`, {
    headers: oauthHeaders(token),
  });
  if (!res.ok) throw new Error(`Jira accessible-resources failed (${res.status})`);
  const sites = (await res.json()) as { id: string; url: string; name: string }[];
  if (!sites.length) throw new Error("No Atlassian site is authorized for this token");
  return sites[0];
}

export function jiraAuthFromOAuth(token: string, cloudId: string): JiraAuth {
  return { baseUrl: `${AUTH_API}/ex/jira/${cloudId}/rest/api/3`, authHeader: `Bearer ${token}` };
}

export function jiraAuthFromApiToken(siteUrl: string, email: string, apiToken: string): JiraAuth {
  const basic = Buffer.from(`${email}:${apiToken}`).toString("base64");
  return { baseUrl: `${siteUrl.replace(/\/$/, "")}/rest/api/3`, authHeader: `Basic ${basic}` };
}

export async function jiraValidate(auth: JiraAuth) {
  // /myself requires the extra "read:jira-user" granular scope, which most
  // OAuth apps won't have requested — /serverInfo only needs a valid,
  // authenticated request, so it works for both OAuth and API-token auth.
  const res = await fetch(`${auth.baseUrl}/serverInfo`, {
    headers: { Authorization: auth.authHeader, Accept: "application/json" },
  });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error("Jira rejected these credentials — check the token/OAuth scopes and try again");
    }
    throw new Error(`Jira credentials invalid (${res.status})`);
  }
  const data = await res.json();
  return { name: (data.serverTitle as string) || "Jira" };
}

async function searchIssues(auth: JiraAuth, jql: string) {
  const res = await fetch(`${auth.baseUrl}/search/jql?jql=${encodeURIComponent(jql)}&maxResults=5&fields=summary,status`, {
    headers: { Authorization: auth.authHeader, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Jira search failed (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return (data.issues ?? []).map(
    (issue: { key: string; fields?: { summary?: string; status?: { name?: string } } }) => ({
      key: issue.key,
      summary: issue.fields?.summary ?? "(no summary)",
      status: issue.fields?.status?.name ?? "unknown",
    })
  );
}

export async function jiraSearchProjectIssues(auth: JiraAuth, projectKey: string, keyword?: string) {
  // /search was removed by Atlassian in favor of /search/jql (same request shape).
  if (keyword) {
    const escaped = keyword.replace(/"/g, '\\"');
    const matched = await searchIssues(auth, `project=${projectKey} AND text ~ "${escaped}" ORDER BY updated DESC`);
    if (matched.length) return matched;
  }
  // No keyword, or nothing matched it — fall back to the project's most
  // recently updated issues so there's still real evidence to show.
  return searchIssues(auth, `project=${projectKey} ORDER BY updated DESC`);
}

export async function jiraCreateIssue(
  auth: JiraAuth,
  projectKey: string,
  summary: string,
  description: string
) {
  const res = await fetch(`${auth.baseUrl}/issue`, {
    method: "POST",
    headers: { Authorization: auth.authHeader, "Content-Type": "application/json" },
    body: JSON.stringify({
      fields: {
        project: { key: projectKey },
        summary,
        description: {
          type: "doc",
          version: 1,
          content: [{ type: "paragraph", content: [{ type: "text", text: description }] }],
        },
        issuetype: { name: "Task" },
      },
    }),
  });
  if (!res.ok) throw new Error(`Jira create issue failed (${res.status}): ${await res.text()}`);
  const issue = await res.json();
  return { key: issue.key as string };
}

export async function jiraVerifyIssue(auth: JiraAuth, key: string) {
  const res = await fetch(`${auth.baseUrl}/issue/${key}`, {
    headers: { Authorization: auth.authHeader, Accept: "application/json" },
  });
  return res.ok;
}
