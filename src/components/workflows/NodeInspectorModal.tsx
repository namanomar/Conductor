"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import type { Edge } from "@xyflow/react";
import { CheckCircle2, ExternalLink, Loader2, X, XCircle } from "lucide-react";
import { appMeta } from "@/lib/app-meta";
import type { AppId, ConnectionApiState } from "@/lib/types";
import type { WorkflowNode, NodeRunStatus } from "./nodes";

export interface NodeRunInfo {
  status: NodeRunStatus;
  log: string[];
  output?: unknown;
  startedAt?: string;
  endedAt?: string;
}

const kindDescription: Record<WorkflowNode["data"]["kind"], string> = {
  trigger: "Starts the workflow. Only a PagerDuty-icon trigger actually reads a live incident right now — other triggers just kick off the run.",
  investigate: "Gathers evidence from the connected app, searched using the incident's own keywords when available.",
  reason: "An OpenAI call that synthesizes the gathered evidence into a hypothesis and drafts what each action should say.",
  approval: "Pauses the run until a human clicks Approve — no write action runs before this.",
  action: "A write operation against the connected app, using content drafted by the reason step.",
  verify: "Re-fetches what the upstream action(s) created and confirms it actually exists.",
  tool: "Calls one specific tool exposed by a connected MCP server (custom connection, or a built-in app connected via MCP).",
};

function isHypothesisOutput(output: unknown): output is { summary: string; confidence: number } {
  return (
    typeof output === "object" &&
    output !== null &&
    typeof (output as Record<string, unknown>).summary === "string" &&
    typeof (output as Record<string, unknown>).confidence === "number"
  );
}

function outputUrl(output: unknown): string | undefined {
  if (typeof output !== "object" || output === null) return undefined;
  const url = (output as Record<string, unknown>).url;
  return typeof url === "string" ? url : undefined;
}

function appForNode(node: WorkflowNode): AppId | null {
  const icon = node.data.icon;
  if (node.data.kind === "trigger") return icon === "alert" ? "pagerduty" : null;
  if (icon === "slack" || icon === "github" || icon === "jira") return icon;
  return null;
}

const statusMeta: Record<NodeRunStatus, { label: string; color: string }> = {
  idle: { label: "Not run yet", color: "var(--muted)" },
  running: { label: "Running", color: "var(--warning)" },
  success: { label: "Success", color: "var(--success)" },
  error: { label: "Error", color: "var(--danger)" },
  skipped: { label: "Skipped", color: "var(--muted)" },
};

export function NodeInspectorModal({
  node,
  edges,
  nodes,
  runInfo,
  onClose,
}: {
  node: WorkflowNode | null;
  edges: Edge[];
  nodes: WorkflowNode[];
  runInfo?: NodeRunInfo;
  onClose: () => void;
}) {
  const [connections, setConnections] = useState<ConnectionApiState[] | null>(null);

  useEffect(() => {
    if (!node) return;
    let cancelled = false;
    fetch("/api/connections")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setConnections(d.connections ?? null);
      })
      .catch(() => {
        if (!cancelled) setConnections(null);
      });
    return () => {
      cancelled = true;
    };
  }, [node]);

  const app = node ? appForNode(node) : null;
  const connection = app ? connections?.find((c) => c.id === app) : undefined;
  const meta = app ? appMeta[app] : null;

  const upstreamApps =
    node && node.data.kind === "verify"
      ? edges
          .filter((e) => e.target === node.id)
          .map((e) => nodes.find((n) => n.id === e.source))
          .filter((n): n is WorkflowNode => n !== undefined && n.data.kind === "action")
          .map((n) => appForNode(n))
          .filter((a): a is AppId => Boolean(a))
      : [];

  return (
    <AnimatePresence>
      {node && (
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      >
        <motion.div
          key="panel"
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => e.stopPropagation()}
          className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-surface p-5 shadow-2xl"
        >
          <div className="mb-4 flex items-start justify-between">
            <div>
              <div className="mb-1 inline-flex rounded-full border border-border-soft bg-surface-2 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
                {node.data.kind}
              </div>
              <h2 className="text-base font-medium">{node.data.label}</h2>
              {node.data.sub && <p className="text-xs text-muted">{node.data.sub}</p>}
            </div>
            <button onClick={onClose} className="text-muted transition hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="mb-5 text-xs leading-relaxed text-muted">{kindDescription[node.data.kind]}</p>

          {app && meta && (
            <div className="mb-5 rounded-xl border border-border-soft bg-surface-2 p-3.5">
              <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted">Setup required</div>
              {connections === null ? (
                <div className="flex items-center gap-2 text-xs text-muted">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking connection…
                </div>
              ) : (
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted">App</span>
                    <span className="font-medium">{meta.label}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Connection</span>
                    {connection?.connected ? (
                      <span className="flex items-center gap-1 font-medium text-success">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Connected ({connection.mode.toUpperCase()})
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 font-medium text-danger">
                        <XCircle className="h-3.5 w-3.5" /> Not connected
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Config</span>
                    <span className="font-medium">
                      {connection?.config || <span className="text-danger">not set</span>}
                    </span>
                  </div>
                  {(!connection?.connected || !connection?.config) && (
                    <Link
                      href="/app/connections"
                      className="mt-1 flex items-center gap-1 text-accent-2 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> Fix in Connections
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}

          {node.data.kind === "verify" && upstreamApps.length > 0 && (
            <div className="mb-5 text-xs text-muted">
              Verifies output from: {upstreamApps.map((a) => appMeta[a].label).join(", ")}
            </div>
          )}

          {node.data.kind === "reason" && (
            <div className="mb-5 rounded-xl border border-border-soft bg-surface-2 p-3.5 text-xs text-muted">
              Requires <code className="rounded bg-surface px-1 py-0.5">OPENAI_API_KEY</code> in the
              server environment. No per-node config needed.
            </div>
          )}

          {node.data.kind === "tool" && (
            <div className="mb-5 rounded-xl border border-border-soft bg-surface-2 p-3.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted">Connection</span>
                <span className="font-medium">{node.data.sub || node.data.sourceId}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-muted">Tool</span>
                <span className="font-mono font-medium">{node.data.toolName}</span>
              </div>
              <p className="mt-2 text-[11px] text-muted">
                Called with no arguments — tools that require input will report that clearly in
                their log rather than fail silently.
              </p>
            </div>
          )}

          <div>
            <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted">
              {runInfo ? "Response" : "Run output"}
            </div>
            {!runInfo ? (
              <p className="rounded-xl border border-dashed border-border-soft p-3.5 text-xs text-muted">
                This node hasn&apos;t run yet. Start a run from the Runs page to see its live log
                and output here.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-medium" style={{ color: statusMeta[runInfo.status].color }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: statusMeta[runInfo.status].color }} />
                  {statusMeta[runInfo.status].label}
                </div>
                {runInfo.log.length > 0 && (
                  <ul className="space-y-1.5">
                    {runInfo.log.map((line, i) => (
                      <li key={i} className="rounded-lg border border-border-soft bg-surface-2 px-2.5 py-1.5 text-xs">
                        {line}
                      </li>
                    ))}
                  </ul>
                )}
                {node.data.kind === "reason" && isHypothesisOutput(runInfo.output) ? (
                  <div className="rounded-lg border border-border-soft bg-surface-2 p-3">
                    <p className="text-xs leading-relaxed text-foreground/90">{runInfo.output.summary}</p>
                    <div className="mt-2.5 flex items-center gap-2">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface">
                        <div
                          className="h-full rounded-full bg-accent"
                          style={{ width: `${Math.max(0, Math.min(100, runInfo.output.confidence))}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-medium text-muted">
                        {runInfo.output.confidence}% confidence
                      </span>
                    </div>
                  </div>
                ) : (
                  outputUrl(runInfo.output) && (
                    <a
                      href={outputUrl(runInfo.output)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-xs font-medium text-accent-2 transition hover:bg-accent/15"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open what this action created
                    </a>
                  )
                )}
                {runInfo.output !== undefined && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted hover:text-foreground">Raw output</summary>
                    <pre className="scrollbar-thin mt-2 overflow-x-auto rounded-lg border border-border-soft bg-surface-2 p-2.5 text-[11px] leading-relaxed">
                      {JSON.stringify(runInfo.output, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
}
