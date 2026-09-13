import { NextResponse } from "next/server";
import { listWorkflowToolNodes } from "@/lib/server/dynamic-mcp-tools";

export async function GET() {
  try {
    const tools = await listWorkflowToolNodes();
    return NextResponse.json({ tools });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list workflow tools" },
      { status: 500 }
    );
  }
}
