import { NextResponse } from "next/server";
import { deleteCustomConnection } from "@/lib/server/custom-connections-store";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deleteCustomConnection(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to remove connection" },
      { status: 400 }
    );
  }
}
