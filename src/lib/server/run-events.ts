import { EventEmitter } from "events";

declare global {
  // eslint-disable-next-line no-var
  var __conductorRunEmitters: Map<string, EventEmitter> | undefined;
  // eslint-disable-next-line no-var
  var __conductorRunApprovals: Map<string, () => void> | undefined;
}

function emitters(): Map<string, EventEmitter> {
  if (!global.__conductorRunEmitters) global.__conductorRunEmitters = new Map();
  return global.__conductorRunEmitters;
}

function approvals(): Map<string, () => void> {
  if (!global.__conductorRunApprovals) global.__conductorRunApprovals = new Map();
  return global.__conductorRunApprovals;
}

export function getRunEmitter(runId: string): EventEmitter {
  const map = emitters();
  let emitter = map.get(runId);
  if (!emitter) {
    emitter = new EventEmitter();
    emitter.setMaxListeners(50);
    map.set(runId, emitter);
  }
  return emitter;
}

export function emitRunUpdate(runId: string) {
  getRunEmitter(runId).emit("update");
}

export function waitForApproval(runId: string): Promise<void> {
  return new Promise((resolve) => {
    approvals().set(runId, resolve);
  });
}

export function resolveApproval(runId: string): boolean {
  const resolve = approvals().get(runId);
  if (!resolve) return false;
  approvals().delete(runId);
  resolve();
  return true;
}
