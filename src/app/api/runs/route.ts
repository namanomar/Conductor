import { NextResponse } from "next/server";
import { createRun, listRuns } from "@/lib/server/runs-store";
import { executeWorkflow } from "@/lib/server/engine";
import { requireUserId } from "@/lib/server/current-user";

export async function GET() {
  try {
    const userId = await requireUserId();
    const runs = await listRuns(userId);
    return NextResponse.json({ runs });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list runs" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    if (!Array.isArray(body.nodes) || !Array.isArray(body.edges)) {
      return NextResponse.json({ error: "nodes and edges are required" }, { status: 400 });
    }
    const id = await createRun(userId, body.name || "Untitled workflow", body.nodes, body.edges);

    executeWorkflow(id).catch((err) => {
      console.error(`Run ${id} crashed:`, err);
    });

    return NextResponse.json({ id });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to start run" },
      { status: 500 }
    );
  }
}
