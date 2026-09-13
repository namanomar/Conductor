import { NextResponse } from "next/server";
import { parseAppId } from "@/lib/server/app-id";
import { providers, redirectUriFor } from "@/lib/server/providers";
import { env } from "@/lib/server/env";
import { saveCredential } from "@/lib/server/connections-store";
import { requireUserId } from "@/lib/server/current-user";
import { githubValidate } from "@/lib/server/connectors/github";
import { slackValidate } from "@/lib/server/connectors/slack";
import { jiraAccessibleResources, jiraAuthFromOAuth, jiraValidate } from "@/lib/server/connectors/jira";

function fail(app: string, message: string) {
  const url = new URL(`/app/connections`, env.appBaseUrl());
  url.searchParams.set("error", message);
  url.searchParams.set("app", app);
  return NextResponse.redirect(url.toString());
}

function ok(app: string) {
  const url = new URL(`/app/connections`, env.appBaseUrl());
  url.searchParams.set("connected", app);
  return NextResponse.redirect(url.toString());
}

export async function GET(req: Request, { params }: { params: Promise<{ app: string }> }) {
  const app = parseAppId((await params).app);
  const meta = providers[app];
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  if (oauthError) return fail(app, `${app} denied authorization: ${oauthError}`);
  if (!code) return fail(app, "Missing authorization code");

  const cookieState = req.headers
    .get("cookie")
    ?.split("; ")
    .find((c) => c.startsWith(`oauth_state_${app}=`))
    ?.split("=")[1];
  if (!state || state !== cookieState) return fail(app, "OAuth state mismatch — please retry");

  if (!meta.oauthTokenUrl) return fail(app, `${app} has no token endpoint configured`);
  const redirectUri = redirectUriFor(app);

  try {
    const userId = await requireUserId();

    if (app === "github") {
      const clientId = env.github.clientId();
      const clientSecret = env.github.clientSecret();
      if (!clientId || !clientSecret) return fail(app, "Missing GITHUB_CLIENT_ID/SECRET");
      const res = await fetch(meta.oauthTokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri }),
      });
      const data = await res.json();
      if (!data.access_token) return fail(app, data.error_description || "GitHub token exchange failed");
      const who = await githubValidate(data.access_token);
      await saveCredential(userId, app, { type: "oauth", accessToken: data.access_token, meta: { login: who.login } });
      return ok(app);
    }

    if (app === "slack") {
      const clientId = env.slack.clientId();
      const clientSecret = env.slack.clientSecret();
      if (!clientId || !clientSecret) return fail(app, "Missing SLACK_CLIENT_ID/SECRET");
      const form = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      });
      const res = await fetch(meta.oauthTokenUrl, { method: "POST", body: form });
      const data = await res.json();
      if (!data.ok) return fail(app, data.error || "Slack token exchange failed");
      const token = data.access_token as string;
      const who = await slackValidate(token);
      await saveCredential(userId, app, { type: "oauth", accessToken: token, meta: { team: who.team } });
      return ok(app);
    }

    if (app === "jira") {
      const clientId = env.jira.clientId();
      const clientSecret = env.jira.clientSecret();
      if (!clientId || !clientSecret) return fail(app, "Missing JIRA_CLIENT_ID/SECRET");
      const res = await fetch(meta.oauthTokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "authorization_code",
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
        }),
      });
      const data = await res.json();
      if (!data.access_token) return fail(app, data.error_description || "Jira token exchange failed");
      const site = await jiraAccessibleResources(data.access_token);
      await jiraValidate(jiraAuthFromOAuth(data.access_token, site.id));
      await saveCredential(userId, app, {
        type: "oauth",
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        meta: { cloudId: site.id, siteUrl: site.url },
      });
      return ok(app);
    }

    return fail(app, `${app} OAuth not implemented`);
  } catch (err) {
    return fail(app, err instanceof Error ? err.message : "OAuth callback failed");
  }
}
