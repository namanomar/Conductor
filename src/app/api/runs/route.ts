import { NextResponse } from "next/server";
import { createRun } from "@/lib/server/runs-store";
import { executeWorkflow } from "@/lib/server/engine";
import { getDb, collections } from "@/lib/server/mongodb";

export async function GET() {
  try {
    const db = await getDb();
    const runs = await db
      .collection(collections.runs)
      .find({}, { projection: { nodes: 0, edges: 0 } })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();
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
    const body = await req.json();
    if (!Array.isArray(body.nodes) || !Array.isArray(body.edges)) {
      return NextResponse.json({ error: "nodes and edges are required" }, { status: 400 });
    }
    const id = await createRun(body.name || "Untitled workflow", body.nodes, body.edges);

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
