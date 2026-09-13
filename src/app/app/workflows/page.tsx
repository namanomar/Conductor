"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ReactFlowProvider } from "@xyflow/react";
import type { Edge } from "@xyflow/react";
import { Library, LayoutTemplate, Loader2, Play, Save, Sparkles, Trash2 } from "lucide-react";
import { Canvas } from "@/components/workflows/Canvas";
import { NodePalette } from "@/components/workflows/NodePalette";
import { NodeInspectorModal } from "@/components/workflows/NodeInspectorModal";
import { ScheduleControl } from "@/components/workflows/ScheduleControl";
import { Button } from "@/components/ui/Button";
import { incidentCommanderTemplate } from "@/lib/workflow-templates";
import type { WorkflowNode } from "@/components/workflows/nodes";

interface Graph {
  nodes: WorkflowNode[];
  edges: Edge[];
}

export default function WorkflowsPage() {
  return (
    <Suspense fallback={null}>
      <WorkflowsPageInner />
    </Suspense>
  );
}

function WorkflowsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const loadId = searchParams.get("load");

  const [graph, setGraph] = useState<Graph>(incidentCommanderTemplate);
  const [resetKey, setResetKey] = useState(0);
  const [name, setName] = useState("Incident Commander");
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [loadingSaved, setLoadingSaved] = useState(Boolean(loadId));
  const [error, setError] = useState<string | null>(null);
  const [inspected, setInspected] = useState<{ node: WorkflowNode; graph: Graph } | null>(null);
  const latest = useRef<Graph>(incidentCommanderTemplate);

  const applyGraph = (next: Graph, newName?: string, id?: string | null) => {
    setGraph(next);
    latest.current = next;
    if (newName) setName(newName);
    setWorkflowId(id ?? null);
    setResetKey((k) => k + 1);
  };

  useEffect(() => {
    if (!loadId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/workflows/${loadId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        if (!cancelled) {
          applyGraph({ nodes: data.workflow.nodes, edges: data.workflow.edges }, data.workflow.name, loadId);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load workflow");
      } finally {
        if (!cancelled) setLoadingSaved(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadId]);

  const loadTemplate = () => applyGraph(incidentCommanderTemplate, "Incident Commander");

  const clearCanvas = () => applyGraph({ nodes: [], edges: [] }, "Untitled workflow");

  const generate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/workflow/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      applyGraph(data.graph, prompt.slice(0, 60));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const save = async (): Promise<string> => {
    setSaving(true);
    setError(null);
    try {
      const body = { name, nodes: latest.current.nodes, edges: latest.current.edges };
      if (workflowId) {
        const res = await fetch(`/api/workflows/${workflowId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        return workflowId;
      }
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setWorkflowId(data.id);
      return data.id as string;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const run = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, nodes: latest.current.nodes, edges: latest.current.edges }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/app/runs/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start run");
      setRunning(false);
    }
  };

  if (loadingSaved) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading workflow…
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border-soft bg-surface/40 px-6 py-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-lg border border-transparent bg-transparent px-1 text-sm font-medium outline-none focus:border-border-soft focus:bg-surface-2"
        />
        <div className="flex items-center gap-2">
          <Link href="/app/workflows/library">
            <Button variant="secondary" size="sm">
              <Library className="h-3.5 w-3.5" />
              Library
            </Button>
          </Link>
          <Button variant="secondary" size="sm" onClick={loadTemplate}>
            <LayoutTemplate className="h-3.5 w-3.5" />
            Incident Commander template
          </Button>
          <Button variant="danger-ghost" size="sm" onClick={clearCanvas}>
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </Button>
          <Button variant="secondary" size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save
          </Button>
          <ScheduleControl workflowId={workflowId} ensureSaved={save} />
          <Button variant="primary" size="sm" onClick={run} disabled={running}>
            {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            Run
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <NodePalette />
        <div className="flex-1 bg-background bg-grid">
          <ReactFlowProvider>
            <Canvas
              key={resetKey}
              initialNodes={graph.nodes}
              initialEdges={graph.edges}
              onGraphChange={(nodes, edges) => {
                latest.current = { nodes, edges };
              }}
              onNodeClick={(node) => setInspected({ node, graph: latest.current })}
            />
          </ReactFlowProvider>
        </div>
      </div>

      <div className="border-t border-border-soft bg-surface/40 px-6 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0 text-accent-2" />
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generate()}
            placeholder='Describe a workflow, e.g. "When a SEV-1 fires, search Slack and GitHub, then ask for approval before posting an update"'
            className="w-full rounded-lg border border-border-soft bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent-2"
          />
          <Button variant="accent" size="sm" className="shrink-0" onClick={generate} disabled={generating || !prompt.trim()}>
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Generate
          </Button>
        </div>
        {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      </div>

      <NodeInspectorModal
        node={inspected?.node ?? null}
        nodes={inspected?.graph.nodes ?? []}
        edges={inspected?.graph.edges ?? []}
        onClose={() => setInspected(null)}
      />
    </div>
  );
}
