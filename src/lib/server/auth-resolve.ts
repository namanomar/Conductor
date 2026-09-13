import { getConnection, getAccessToken, type ConnectionDoc } from "./connections-store";
import { jiraAuthFromApiToken, jiraAuthFromOAuth, type JiraAuth } from "./connectors/jira";
import type { AppId } from "@/lib/types";

export interface ResolvedConnection {
  doc: ConnectionDoc;
  token: string;
  jiraAuth?: JiraAuth;
}

export async function resolveConnection(userId: string, app: AppId): Promise<ResolvedConnection> {
  const doc = await getConnection(userId, app);
  if (!doc?.connected || !doc.credential) {
    throw new Error(`${app} is not connected — connect it on the Connections page first`);
  }
  const token = getAccessToken(doc);
  if (!token) throw new Error(`${app} has no stored credential`);

  if (app === "jira") {
    const jiraAuth =
      doc.credential.type === "oauth"
        ? jiraAuthFromOAuth(token, doc.credential.meta?.cloudId ?? "")
        : jiraAuthFromApiToken(
            doc.credential.meta?.siteUrl ?? "",
            doc.credential.meta?.email ?? "",
            token
          );
    return { doc, token, jiraAuth };
  }

  return { doc, token };
}
