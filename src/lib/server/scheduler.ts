import { ObjectId } from "mongodb";
import { getDb, collections } from "./mongodb";
import { findDueSchedules, markScheduleRan } from "./schedules-store";
import { createRun } from "./runs-store";
import { executeWorkflow } from "./engine";
import type { WorkflowNode } from "@/components/workflows/nodes";
import type { Edge } from "@xyflow/react";

const TICK_MS = 30_000;

declare global {
  // eslint-disable-next-line no-var
  var __conductorSchedulerStarted: boolean | undefined;
}

interface WorkflowDoc {
  _id: ObjectId;
  userId: string;
  name: string;
  nodes: WorkflowNode[];
  edges: Edge[];
}

async function tick() {
  let due: Awaited<ReturnType<typeof findDueSchedules>> = [];
  try {
    due = await findDueSchedules();
  } catch {
    return; // database not configured yet — nothing to do
  }

  for (const schedule of due) {
    try {
      const db = await getDb();
      const workflow = await db
        .collection<WorkflowDoc>(collections.workflows)
        .findOne({ _id: new ObjectId(schedule.workflowId), userId: schedule.userId });

      if (!workflow) {
        await markScheduleRan(schedule._id, schedule.intervalMinutes, "");
        continue;
      }

      const runId = await createRun(schedule.userId, `${workflow.name} (scheduled)`, workflow.nodes, workflow.edges);
      await markScheduleRan(schedule._id, schedule.intervalMinutes, runId);

      executeWorkflow(runId).catch((err) => {
        console.error(`Scheduled run ${runId} crashed:`, err);
      });
    } catch (err) {
      console.error(`Scheduler tick failed for schedule ${schedule._id.toString()}:`, err);
    }
  }
}

export function startScheduler() {
  if (global.__conductorSchedulerStarted) return;
  global.__conductorSchedulerStarted = true;
  setInterval(() => {
    tick().catch(() => {});
  }, TICK_MS);
}
