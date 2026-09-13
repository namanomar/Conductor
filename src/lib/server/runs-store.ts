import { ObjectId } from "mongodb";
import { getDb, collections } from "./mongodb";
import type { Edge } from "@xyflow/react";
import type { WorkflowNode } from "@/components/workflows/nodes";

export type NodeRunStatus = "idle" | "running" | "success" | "error" | "skipped";

export interface NodeState {
  status: NodeRunStatus;
  log: string[];
  output?: unknown;
  startedAt?: string;
  endedAt?: string;
}

export type RunStatus = "running" | "awaiting_approval" | "completed" | "failed";

export interface RunDoc {
  _id: ObjectId;
  userId: string;
  workflowName: string;
  nodes: WorkflowNode[];
  edges: Edge[];
  status: RunStatus;
  nodeStates: Record<string, NodeState>;
  createdAt: string;
  updatedAt: string;
}

export async function createRun(userId: string, name: string, nodes: WorkflowNode[], edges: Edge[]) {
  const db = await getDb();
  const now = new Date().toISOString();
  const nodeStates: Record<string, NodeState> = {};
  for (const n of nodes) nodeStates[n.id] = { status: "idle", log: [] };

  const result = await db.collection<Omit<RunDoc, "_id">>(collections.runs).insertOne({
    userId,
    workflowName: name,
    nodes,
    edges,
    status: "running",
    nodeStates,
    createdAt: now,
    updatedAt: now,
  });
  return result.insertedId.toString();
}

export async function getRun(id: string): Promise<RunDoc | null> {
  const db = await getDb();
  return db.collection<RunDoc>(collections.runs).findOne({ _id: new ObjectId(id) });
}

export async function listRuns(userId: string) {
  const db = await getDb();
  return db
    .collection<RunDoc>(collections.runs)
    .find({ userId }, { projection: { nodes: 0, edges: 0 } })
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();
}

export async function patchRun(id: string, patch: Partial<Pick<RunDoc, "status">>) {
  const db = await getDb();
  await db
    .collection<RunDoc>(collections.runs)
    .updateOne({ _id: new ObjectId(id) }, { $set: { ...patch, updatedAt: new Date().toISOString() } });
}

export async function patchNodeState(id: string, nodeId: string, patch: Partial<NodeState>, appendLog?: string) {
  const db = await getDb();
  const set: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  for (const [k, v] of Object.entries(patch)) {
    set[`nodeStates.${nodeId}.${k}`] = v;
  }
  const update: Record<string, unknown> = { $set: set };
  if (appendLog) {
    update.$push = { [`nodeStates.${nodeId}.log`]: appendLog };
  }
  await db.collection<RunDoc>(collections.runs).updateOne({ _id: new ObjectId(id) }, update);
}
