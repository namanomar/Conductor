import { NextResponse } from "next/server";
import { parseAppId } from "@/lib/server/app-id";
import { upsertConnectionSettings, disconnectApp, getConnectionPublic } from "@/lib/server/connections-store";
import { requireUserId } from "@/lib/server/current-user";
import { providers } from "@/lib/server/providers";
import type { ConnectionMode, DataMode } from "@/lib/types";

export async function PATCH(req: Request, { params }: { params: Promise<{ app: string }> }) {
  try {
    const userId = await requireUserId();
    const app = parseAppId((await params).app);
    const body = await req.json();

    if (body.mode && body.mode !== "mcp" && providers[app].mcpOnly) {
      return NextResponse.json({ error: `${app} only supports MCP connections in this app` }, { status: 400 });
    }

    const patch: { mode?: ConnectionMode; dataMode?: DataMode; config?: string } = {};
    if (body.mode !== undefined) patch.mode = body.mode;
    if (body.dataMode !== undefined) patch.dataMode = body.dataMode;
    if (body.config !== undefined) patch.config = body.config;

    await upsertConnectionSettings(userId, app, patch);
    const doc = await getConnectionPublic(userId, app);
    return NextResponse.json({ connection: doc });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update connection" },
      { status: 400 }
    );
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ app: string }> }) {
  try {
    const userId = await requireUserId();
    const app = parseAppId((await params).app);
    await disconnectApp(userId, app);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to disconnect" },
      { status: 400 }
    );
  }
}
