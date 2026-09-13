import { NextResponse } from "next/server";
import { parseAppId } from "@/lib/server/app-id";
import { saveCredential } from "@/lib/server/connections-store";
import { requireUserId } from "@/lib/server/current-user";
import { providers } from "@/lib/server/providers";
import { pagerdutyValidate } from "@/lib/server/connectors/pagerduty";
import { githubValidate } from "@/lib/server/connectors/github";
import { slackValidate } from "@/lib/server/connectors/slack";
import { jiraAuthFromApiToken, jiraValidate } from "@/lib/server/connectors/jira";

export async function POST(req: Request, { params }: { params: Promise<{ app: string }> }) {
  const app = parseAppId((await params).app);
  const body = await req.json();

  if (providers[app].mcpOnly) {
    return NextResponse.json({ error: `${app} only supports MCP connections in this app` }, { status: 400 });
  }

  try {
    const userId = await requireUserId();

    if (app === "pagerduty") {
      if (!body.apiKey) return NextResponse.json({ error: "apiKey is required" }, { status: 400 });
      const who = await pagerdutyValidate(body.apiKey);
      await saveCredential(userId, app, { type: "api_key", accessToken: body.apiKey, meta: { name: who.name } });
      return NextResponse.json({ ok: true, name: who.name });
    }

    if (app === "github") {
      if (!body.token) return NextResponse.json({ error: "token is required" }, { status: 400 });
      const who = await githubValidate(body.token);
      await saveCredential(userId, app, { type: "api_key", accessToken: body.token, meta: { login: who.login } });
      return NextResponse.json({ ok: true, name: who.login });
    }

    if (app === "slack") {
      if (!body.token) return NextResponse.json({ error: "token is required" }, { status: 400 });
      const who = await slackValidate(body.token);
      await saveCredential(userId, app, { type: "api_key", accessToken: body.token, meta: { team: who.team } });
      return NextResponse.json({ ok: true, name: who.team });
    }

    if (app === "jira") {
      const { siteUrl, email, apiToken } = body;
      if (!siteUrl || !email || !apiToken) {
        return NextResponse.json({ error: "siteUrl, email, and apiToken are all required" }, { status: 400 });
      }
      const auth = jiraAuthFromApiToken(siteUrl, email, apiToken);
      const who = await jiraValidate(auth);
      await saveCredential(userId, app, {
        type: "api_key",
        accessToken: apiToken,
        meta: { siteUrl, email, name: who.name },
      });
      return NextResponse.json({ ok: true, name: who.name });
    }

    return NextResponse.json({ error: "Unsupported app" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Connection failed" },
      { status: 400 }
    );
  }
}
