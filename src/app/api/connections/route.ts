import { NextResponse } from "next/server";
import { listConnectionsPublic } from "@/lib/server/connections-store";
import { initialConnections } from "@/lib/connection-defaults";

export async function GET() {
  try {
    const stored = await listConnectionsPublic();
    const byId = new Map(stored.map((c) => [c.id, c]));
    const merged = initialConnections.map((defaults) => {
      const found = byId.get(defaults.id);
      return found ?? {
        id: defaults.id,
        connected: false,
        mode: defaults.mode,
        dataMode: defaults.dataMode,
      };
    });
    return NextResponse.json({ connections: merged });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load connections" },
      { status: 500 }
    );
  }
}
