import { NextResponse } from "next/server";
import { resolveApproval } from "@/lib/server/run-events";
import { getRun } from "@/lib/server/runs-store";
import { requireUserId } from "@/lib/server/current-user";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  const { id } = await params;

  const run = await getRun(id);
  if (!run || run.userId !== userId) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  const resolved = resolveApproval(id);
  if (!resolved) {
    return NextResponse.json(
      { error: "This run is not currently waiting on approval (or the server restarted)" },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true });
}
