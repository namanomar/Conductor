import { NextResponse } from "next/server";
import { parseAppId } from "@/lib/server/app-id";
import { getConnection, getAccessToken, markSynced } from "@/lib/server/connections-store";
import { getDb, collections } from "@/lib/server/mongodb";
import { githubSearchRecentPRs } from "@/lib/server/connectors/github";
import { slackSearchChannel } from "@/lib/server/connectors/slack";
import { jiraAuthFromApiToken, jiraAuthFromOAuth, jiraSearchProjectIssues } from "@/lib/server/connectors/jira";
import { pagerdutyOpenIncidents } from "@/lib/server/connectors/pagerduty";

export async function POST(_req: Request, { params }: { params: Promise<{ app: string }> }) {
  const app = parseAppId((await params).app);
  const doc = await getConnection(app);

  if (!doc?.connected || !doc.credential) {
    return NextResponse.json({ error: `${app} is not connected` }, { status: 400 });
  }
  if (doc.dataMode !== "synced") {
    return NextResponse.json({ error: `${app} is set to Live mode, not Synced` }, { status: 400 });
  }
  if (doc.credential.type === "mcp_token") {
    return NextResponse.json(
      { error: "Syncing via MCP tool calls isn't wired up yet — switch to a Direct/OAuth connection to sync into MongoDB." },
      { status: 400 }
    );
  }

  const token = getAccessToken(doc);
  if (!token) return NextResponse.json({ error: "No stored credential" }, { status: 400 });

  try {
    let items: Record<string, unknown>[] = [];

    if (app === "github") {
      if (!doc.config) throw new Error("Set a repository (owner/repo) in the connection config first");
      items = await githubSearchRecentPRs(token, doc.config);
    } else if (app === "slack") {
      if (!doc.config) throw new Error("Set a channel ID in the connection config first");
      items = await slackSearchChannel(token, doc.config, "");
    } else if (app === "jira") {
      if (!doc.config) throw new Error("Set a project key in the connection config first");
      const auth =
        doc.credential.type === "oauth"
          ? jiraAuthFromOAuth(token, doc.credential.meta?.cloudId ?? "")
          : jiraAuthFromApiToken(doc.credential.meta?.siteUrl ?? "", doc.credential.meta?.email ?? "", token);
      items = await jiraSearchProjectIssues(auth, doc.config);
    } else if (app === "pagerduty") {
      items = await pagerdutyOpenIncidents(token, doc.config || undefined);
    }

    const db = await getDb();
    const now = new Date().toISOString();
    if (items.length) {
      const ops = items.map((item) => ({
        updateOne: {
          filter: { app, externalId: String((item as { id?: unknown; key?: unknown; number?: unknown }).id ?? (item as { key?: unknown }).key ?? (item as { number?: unknown }).number) },
          update: { $set: { app, data: item, syncedAt: now } },
          upsert: true,
        },
      }));
      await db.collection(collections.syncedItems).bulkWrite(ops);
    }
    await markSynced(app);

    return NextResponse.json({ ok: true, count: items.length, syncedAt: now });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 400 }
    );
  }
}
