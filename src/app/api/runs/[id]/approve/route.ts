import { NextResponse } from "next/server";
import { resolveApproval } from "@/lib/server/run-events";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resolved = resolveApproval(id);
  if (!resolved) {
    return NextResponse.json(
      { error: "This run is not currently waiting on approval (or the server restarted)" },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true });
}
