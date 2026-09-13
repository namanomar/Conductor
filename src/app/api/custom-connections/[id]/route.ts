import { NextResponse } from "next/server";
import { deleteCustomConnection } from "@/lib/server/custom-connections-store";
import { requireUserId } from "@/lib/server/current-user";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    await deleteCustomConnection(userId, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to remove connection" },
      { status: 400 }
    );
  }
}
