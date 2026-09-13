import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb, collections } from "@/lib/server/mongodb";
import {
  getScheduleForWorkflow,
  upsertSchedule,
  setScheduleEnabled,
  deleteSchedule,
} from "@/lib/server/schedules-store";
import { startScheduler } from "@/lib/server/scheduler";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const schedule = await getScheduleForWorkflow(id);
    return NextResponse.json({ schedule });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load schedule" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { intervalMinutes } = await req.json();
    if (!intervalMinutes || intervalMinutes < 1) {
      return NextResponse.json({ error: "intervalMinutes must be a positive number" }, { status: 400 });
    }

    const db = await getDb();
    const workflow = await db.collection(collections.workflows).findOne({ _id: new ObjectId(id) });
    if (!workflow) return NextResponse.json({ error: "Workflow not found — save it first" }, { status: 404 });

    startScheduler();
    const schedule = await upsertSchedule(id, workflow.name as string, intervalMinutes);
    return NextResponse.json({ schedule });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create schedule" },
      { status: 400 }
    );
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { enabled } = await req.json();
    await setScheduleEnabled(id, Boolean(enabled));
    const schedule = await getScheduleForWorkflow(id);
    return NextResponse.json({ schedule });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update schedule" },
      { status: 400 }
    );
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deleteSchedule(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to remove schedule" },
      { status: 400 }
    );
  }
}
