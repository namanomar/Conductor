import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb, collections } from "@/lib/server/mongodb";
import { requireUserId } from "@/lib/server/current-user";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const db = await getDb();
    const workflow = await db.collection(collections.workflows).findOne({ _id: new ObjectId(id), userId });
    if (!workflow) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ workflow });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load workflow" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const body = await req.json();
    const db = await getDb();
    await db.collection(collections.workflows).updateOne(
      { _id: new ObjectId(id), userId },
      { $set: { name: body.name, nodes: body.nodes, edges: body.edges, updatedAt: new Date().toISOString() } }
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update workflow" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const db = await getDb();
    await db.collection(collections.workflows).deleteOne({ _id: new ObjectId(id), userId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete workflow" },
      { status: 500 }
    );
  }
}
