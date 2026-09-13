import { ObjectId } from "mongodb";
import { getDb, collections } from "./mongodb";

export interface ScheduleDoc {
  _id: ObjectId;
  workflowId: string;
  workflowName: string;
  intervalMinutes: number;
  enabled: boolean;
  lastRunAt?: string;
  lastRunId?: string;
  nextRunAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface SchedulePublic {
  id: string;
  workflowId: string;
  workflowName: string;
  intervalMinutes: number;
  enabled: boolean;
  lastRunAt?: string;
  lastRunId?: string;
  nextRunAt: string;
}

function toPublic(doc: ScheduleDoc): SchedulePublic {
  return {
    id: doc._id.toString(),
    workflowId: doc.workflowId,
    workflowName: doc.workflowName,
    intervalMinutes: doc.intervalMinutes,
    enabled: doc.enabled,
    lastRunAt: doc.lastRunAt,
    lastRunId: doc.lastRunId,
    nextRunAt: doc.nextRunAt,
  };
}

export async function listSchedules(): Promise<SchedulePublic[]> {
  const db = await getDb();
  const docs = await db.collection<ScheduleDoc>(collections.schedules).find().toArray();
  return docs.map(toPublic);
}

export async function getScheduleForWorkflow(workflowId: string): Promise<SchedulePublic | null> {
  const db = await getDb();
  const doc = await db.collection<ScheduleDoc>(collections.schedules).findOne({ workflowId });
  return doc ? toPublic(doc) : null;
}

export async function upsertSchedule(
  workflowId: string,
  workflowName: string,
  intervalMinutes: number
): Promise<SchedulePublic> {
  const db = await getDb();
  const now = new Date();
  const nextRunAt = new Date(now.getTime() + intervalMinutes * 60_000).toISOString();

  await db.collection<ScheduleDoc>(collections.schedules).updateOne(
    { workflowId },
    {
      $set: {
        workflowName,
        intervalMinutes,
        enabled: true,
        nextRunAt,
        updatedAt: now.toISOString(),
      },
      $setOnInsert: { workflowId, createdAt: now.toISOString() },
    },
    { upsert: true }
  );

  const doc = await db.collection<ScheduleDoc>(collections.schedules).findOne({ workflowId });
  return toPublic(doc!);
}

export async function setScheduleEnabled(workflowId: string, enabled: boolean): Promise<void> {
  const db = await getDb();
  await db
    .collection<ScheduleDoc>(collections.schedules)
    .updateOne({ workflowId }, { $set: { enabled, updatedAt: new Date().toISOString() } });
}

export async function deleteSchedule(workflowId: string): Promise<void> {
  const db = await getDb();
  await db.collection(collections.schedules).deleteOne({ workflowId });
}

export async function findDueSchedules(): Promise<ScheduleDoc[]> {
  const db = await getDb();
  const now = new Date().toISOString();
  return db
    .collection<ScheduleDoc>(collections.schedules)
    .find({ enabled: true, nextRunAt: { $lte: now } })
    .toArray();
}

export async function markScheduleRan(id: ObjectId, intervalMinutes: number, runId: string): Promise<void> {
  const db = await getDb();
  const now = new Date();
  const nextRunAt = new Date(now.getTime() + intervalMinutes * 60_000).toISOString();
  await db.collection<ScheduleDoc>(collections.schedules).updateOne(
    { _id: id },
    {
      $set: {
        lastRunAt: now.toISOString(),
        lastRunId: runId,
        nextRunAt,
        updatedAt: now.toISOString(),
      },
    }
  );
}
