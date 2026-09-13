import { NextResponse } from "next/server";
import { getDb, collections } from "@/lib/server/mongodb";

export async function GET() {
  try {
    const db = await getDb();
    const workflows = await db
      .collection(collections.workflows)
      .find()
      .sort({ updatedAt: -1 })
      .toArray();
    return NextResponse.json({ workflows });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list workflows" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.name || !Array.isArray(body.nodes) || !Array.isArray(body.edges)) {
      return NextResponse.json({ error: "name, nodes, and edges are required" }, { status: 400 });
    }
    const db = await getDb();
    const now = new Date().toISOString();
    const result = await db.collection(collections.workflows).insertOne({
      name: body.name,
      nodes: body.nodes,
      edges: body.edges,
      createdAt: now,
      updatedAt: now,
    });
    return NextResponse.json({ id: result.insertedId });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save workflow" },
      { status: 500 }
    );
  }
}
