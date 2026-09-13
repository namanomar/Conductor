import { NextResponse } from "next/server";
import {
  getPendingOAuthConnectionByState,
  completeOAuthConnection,
} from "@/lib/server/custom-connections-store";
import { decryptSecret } from "@/lib/server/crypto";
import { mcpListTools } from "@/lib/server/mcp-client";
import { env } from "@/lib/server/env";

function fail(name: string, message: string) {
  const url = new URL("/app/connections", env.appBaseUrl());
  url.searchParams.set("error", message);
  url.searchParams.set("app", name);
  return NextResponse.redirect(url.toString());
}

function ok(name: string) {
  const url = new URL("/app/connections", env.appBaseUrl());
  url.searchParams.set("connected", name);
  return NextResponse.redirect(url.toString());
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  if (oauthError) return fail("custom connection", `Authorization denied: ${oauthError}`);
  if (!code || !state) return fail("custom connection", "Missing authorization code or state");

  const pending = await getPendingOAuthConnectionByState(state);
  if (!pending || !pending.oauth) return fail("custom connection", "This OAuth attempt expired or was already used");

  const { name, endpoint, oauth } = pending;
  const redirectUri = `${env.appBaseUrl()}/api/custom-connections/oauth/callback`;
  const clientSecret = decryptSecret(oauth.clientSecretEnc);

  try {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: oauth.clientId,
      client_secret: clientSecret,
    });
    const basicAuth = Buffer.from(`${oauth.clientId}:${clientSecret}`).toString("base64");

    const res = await fetch(oauth.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        Authorization: `Basic ${basicAuth}`,
      },
      body: body.toString(),
    });

    const data = await res.json();
    if (!res.ok || !data.access_token) {
      throw new Error(data.error_description || data.error || `Token exchange failed (${res.status})`);
    }

    const tools = await mcpListTools(endpoint, data.access_token);
    await completeOAuthConnection(pending._id.toString(), data.access_token, data.refresh_token, tools.length);
    return ok(name);
  } catch (err) {
    return fail(name, err instanceof Error ? err.message : "OAuth connection failed");
  }
}
