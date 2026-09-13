import { NextResponse } from "next/server";
import { parseAppId } from "@/lib/server/app-id";
import { providers } from "@/lib/server/providers";
import { saveCredential } from "@/lib/server/connections-store";
import { requireUserId } from "@/lib/server/current-user";
import { mcpListTools } from "@/lib/server/mcp-client";

export async function POST(req: Request, { params }: { params: Promise<{ app: string }> }) {
  const app = parseAppId((await params).app);
  const body = await req.json();

  if (!body.token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }

  const endpoint = providers[app].mcpEndpoint;

  try {
    const userId = await requireUserId();
    const tools = await mcpListTools(endpoint, body.token);
    await saveCredential(userId, app, {
      type: "mcp_token",
      accessToken: body.token,
      meta: { endpoint, toolCount: String(tools.length) },
    });
    return NextResponse.json({ ok: true, endpoint, tools });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? `Could not connect to ${endpoint}: ${err.message}`
            : "MCP connection failed",
      },
      { status: 400 }
    );
  }
}
