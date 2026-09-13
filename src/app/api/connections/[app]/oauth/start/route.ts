import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { parseAppId } from "@/lib/server/app-id";
import { providers, redirectUriFor } from "@/lib/server/providers";
import { env } from "@/lib/server/env";

const clientIdFor: Record<string, () => string | undefined> = {
  github: env.github.clientId,
  slack: env.slack.clientId,
  jira: env.jira.clientId,
};

function fail(app: string, message: string) {
  const url = new URL("/app/connections", env.appBaseUrl());
  url.searchParams.set("error", message);
  url.searchParams.set("app", app);
  return NextResponse.redirect(url.toString());
}

export async function GET(req: Request, { params }: { params: Promise<{ app: string }> }) {
  const app = parseAppId((await params).app);
  const meta = providers[app];

  if (!meta.supportsOAuth || !meta.oauthAuthorizeUrl) {
    return fail(app, "This app doesn't support OAuth — use a direct connection instead.");
  }

  const clientId = clientIdFor[app]?.();
  if (!clientId) {
    return fail(app, "OAuth isn't configured for this app yet.");
  }

  const state = randomBytes(16).toString("hex");
  const redirectUri = redirectUriFor(app);

  const url = new URL(meta.oauthAuthorizeUrl);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  if (meta.oauthScopes) {
    url.searchParams.set("scope", meta.oauthScopes);
  }
  if (app === "jira") {
    url.searchParams.set("audience", "api.atlassian.com");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("prompt", "consent");
  }

  const res = NextResponse.redirect(url.toString());
  res.cookies.set(`oauth_state_${app}`, state, {
    httpOnly: true,
    maxAge: 600,
    path: "/",
    sameSite: "lax",
  });
  return res;
}
