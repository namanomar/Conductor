"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ReactFlowProvider } from "@xyflow/react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { RunCanvas } from "@/components/workflows/RunCanvas";
import { NodeInspectorModal } from "@/components/workflows/NodeInspectorModal";
import { Button } from "@/components/ui/Button";
import type { WorkflowNode } from "@/components/workflows/nodes";
import type { Edge } from "@xyflow/react";

interface NodeState {
  status: "idle" | "running" | "success" | "error" | "skipped";
  log: string[];
  output?: unknown;
  startedAt?: string;
  endedAt?: string;
}

interface RunDoc {
  _id: string;
  workflowName: string;
  nodes: WorkflowNode[];
  edges: Edge[];
  status: "running" | "awaiting_approval" | "completed" | "failed";
  nodeStates: Record<string, NodeState>;
  createdAt: string;
}

const statusStyle: Record<RunDoc["status"], string> = {
  running: "text-accent-2 border-accent-2/30 bg-accent-2/10",
  awaiting_approval: "text-warning border-warning/30 bg-warning/10",
  completed: "text-success border-success/30 bg-success/10",
  failed: "text-danger border-danger/30 bg-danger/10",
};

export default function RunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [run, setRun] = useState<RunDoc | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    const source = new EventSource(`/api/runs/${id}/stream`);
    source.onmessage = (event) => {
      setRun(JSON.parse(event.data));
    };
    return () => source.close();
  }, [id]);

  const nodesWithStatus = useMemo<WorkflowNode[]>(() => {
    if (!run) return [];
    return run.nodes.map((n) => ({
      ...n,
      data: { ...n.data, runStatus: run.nodeStates[n.id]?.status ?? "idle" },
    }));
  }, [run]);

  const approve = async () => {
    setApproving(true);
    try {
      const res = await fetch(`/api/runs/${id}/approve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
    } finally {
      setApproving(false);
    }
  };

  const selectedNode = selectedId ? run?.nodes.find((n) => n.id === selectedId) ?? null : null;
  const selectedState = selectedId ? run?.nodeStates[selectedId] : undefined;

  if (!run) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connecting to run…
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border-soft bg-surface/40 px-6 py-4">
        <div>
          <h1 className="text-base font-medium">{run.workflowName}</h1>
          <p className="text-xs text-muted">Started {new Date(run.createdAt).toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`rounded-full border px-3 py-1.5 text-xs font-medium ${statusStyle[run.status]}`}>
            {run.status.replace("_", " ")}
          </span>
          {run.status === "awaiting_approval" && (
            <Button variant="primary" size="sm" onClick={approve} disabled={approving}>
              {approving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Approve
            </Button>
          )}
        </div>
      </div>

      <div className="relative flex-1 bg-background bg-grid">
        <ReactFlowProvider>
          <RunCanvas nodes={nodesWithStatus} edges={run.edges} onNodeClick={setSelectedId} />
        </ReactFlowProvider>
      </div>

      <NodeInspectorModal
        node={selectedNode}
        nodes={run.nodes}
        edges={run.edges}
        runInfo={selectedState}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
