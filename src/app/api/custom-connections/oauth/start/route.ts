import { NextResponse } from "next/server";
import { createPendingOAuthConnection } from "@/lib/server/custom-connections-store";
import { requireUserId } from "@/lib/server/current-user";
import { env } from "@/lib/server/env";

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const { name, endpoint, authorizeUrl, tokenUrl, clientId, clientSecret, scopes } = await req.json();

    if (!name || !endpoint || !authorizeUrl || !tokenUrl || !clientId || !clientSecret) {
      return NextResponse.json(
        { error: "name, endpoint, authorizeUrl, tokenUrl, clientId, and clientSecret are all required" },
        { status: 400 }
      );
    }

    for (const [label, url] of [
      ["endpoint", endpoint],
      ["authorizeUrl", authorizeUrl],
      ["tokenUrl", tokenUrl],
    ] as const) {
      try {
        new URL(url);
      } catch {
        return NextResponse.json({ error: `${label} must be a valid URL` }, { status: 400 });
      }
    }

    const { id, state } = await createPendingOAuthConnection(userId, {
      name,
      endpoint,
      authorizeUrl,
      tokenUrl,
      clientId,
      clientSecret,
      scopes,
    });

    const redirectUri = `${env.appBaseUrl()}/api/custom-connections/oauth/callback`;
    const url = new URL(authorizeUrl);
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("state", state);
    if (scopes) url.searchParams.set("scope", scopes);

    return NextResponse.json({ authorizeUrl: url.toString(), id, redirectUri });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to start OAuth flow" },
      { status: 400 }
    );
  }
}
