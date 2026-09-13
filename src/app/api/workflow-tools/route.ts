import { NextResponse } from "next/server";
import { listWorkflowToolNodes } from "@/lib/server/dynamic-mcp-tools";
import { requireUserId } from "@/lib/server/current-user";

export async function GET() {
  try {
    const userId = await requireUserId();
    const tools = await listWorkflowToolNodes(userId);
    return NextResponse.json({ tools });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list workflow tools" },
      { status: 500 }
    );
  }
}
