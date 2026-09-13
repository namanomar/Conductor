import { NextResponse } from "next/server";
import { listCustomConnections, createCustomConnection } from "@/lib/server/custom-connections-store";
import { requireUserId } from "@/lib/server/current-user";
import { mcpListTools } from "@/lib/server/mcp-client";

export async function GET() {
  try {
    const userId = await requireUserId();
    const connections = await listCustomConnections(userId);
    return NextResponse.json({ connections });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list custom connections" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const { name, endpoint, token } = await req.json();
    if (!name || !endpoint || !token) {
      return NextResponse.json({ error: "name, endpoint, and token are all required" }, { status: 400 });
    }
    let url: URL;
    try {
      url = new URL(endpoint);
    } catch {
      return NextResponse.json({ error: "endpoint must be a valid URL" }, { status: 400 });
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return NextResponse.json({ error: "endpoint must be an http(s) URL" }, { status: 400 });
    }

    const tools = await mcpListTools(url.toString(), token);
    const connection = await createCustomConnection(userId, name, url.toString(), token, tools.length);
    return NextResponse.json({ connection, tools });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? `Could not connect: ${err.message}` : "Failed to add connection" },
      { status: 400 }
    );
  }
}
