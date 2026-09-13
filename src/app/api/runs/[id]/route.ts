import { NextResponse } from "next/server";
import { getRun } from "@/lib/server/runs-store";
import { requireUserId } from "@/lib/server/current-user";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const run = await getRun(id);
    if (!run || run.userId !== userId) return NextResponse.json({ error: "Run not found" }, { status: 404 });
    return NextResponse.json({ run });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load run" },
      { status: 500 }
    );
  }
}
