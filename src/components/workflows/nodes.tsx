"use client";

import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  GitPullRequest,
  Loader2,
  MessageSquare,
  Plug,
  ShieldCheck,
  SkipForward,
  Ticket,
  UserCheck,
  XCircle,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type WorkflowNodeKind =
  | "trigger"
  | "investigate"
  | "reason"
  | "approval"
  | "action"
  | "verify"
  | "tool";

export type NodeRunStatus = "idle" | "running" | "success" | "error" | "skipped";

export interface WorkflowNodeData extends Record<string, unknown> {
  label: string;
  kind: WorkflowNodeKind;
  sub?: string;
  icon?: string;
  runStatus?: NodeRunStatus;
  /** kind: "tool" only — identifies which MCP connection + tool this node calls. */
  sourceId?: string;
  toolName?: string;
  /** For built-in investigate/action nodes that support more than one behavior
   * per icon (e.g. Slack: "search_messages" vs "list_channels"). Defaults to
   * each icon's original single behavior when omitted. */
  capability?: string;
}

const runStatusMeta: Record<NodeRunStatus, { icon: LucideIcon; color: string; spin?: boolean }> = {
  idle: { icon: Zap, color: "var(--muted)" },
  running: { icon: Loader2, color: "var(--warning)", spin: true },
  success: { icon: CheckCircle2, color: "var(--success)" },
  error: { icon: XCircle, color: "var(--danger)" },
  skipped: { icon: SkipForward, color: "var(--muted)" },
};

export const kindStyle: Record<WorkflowNodeKind, { color: string; bg: string }> = {
  trigger: { color: "#c6a15b", bg: "rgba(198,161,91,0.12)" },
  investigate: { color: "#7c96b0", bg: "rgba(124,150,176,0.12)" },
  reason: { color: "#6f9c96", bg: "rgba(111,156,150,0.12)" },
  approval: { color: "#cf9a4a", bg: "rgba(207,154,74,0.12)" },
  action: { color: "#b98868", bg: "rgba(185,136,104,0.12)" },
  verify: { color: "#6fae7d", bg: "rgba(111,174,125,0.12)" },
  tool: { color: "#8a8fa8", bg: "rgba(138,143,168,0.12)" },
};

const iconMap: Record<string, LucideIcon> = {
  alert: AlertTriangle,
  slack: MessageSquare,
  github: GitPullRequest,
  jira: Ticket,
  brain: Brain,
  approve: UserCheck,
  verify: ShieldCheck,
  tool: Plug,
  zap: Zap,
};

export type WorkflowNode = Node<WorkflowNodeData, "workflowNode">;

export function WorkflowNodeComponent({ data }: NodeProps<WorkflowNode>) {
  const style = kindStyle[data.kind];
  const Icon = (data.icon && iconMap[data.icon]) || Zap;
  const run = data.runStatus ? runStatusMeta[data.runStatus] : null;
  const RunIcon = run?.icon;

  return (
    <div
      className="relative w-56 cursor-pointer rounded-xl border bg-surface px-4 py-3 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
      style={{
        borderColor: run ? run.color + "88" : style.color + "55",
        boxShadow: data.runStatus === "running" ? `0 0 0 3px ${run?.color}33` : undefined,
      }}
    >
      {data.kind !== "trigger" && (
        <Handle
          type="target"
          position={Position.Left}
          className="!h-2.5 !w-2.5 !border-2 !bg-surface"
          style={{ borderColor: style.color }}
        />
      )}

      {RunIcon && (
        <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border border-border-soft bg-surface">
          <RunIcon className={`h-3 w-3 ${run?.spin ? "animate-spin" : ""}`} style={{ color: run?.color }} />
        </span>
      )}

      <div className="flex items-center gap-2.5">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ background: style.bg }}
        >
          <Icon className="h-4 w-4" style={{ color: style.color }} />
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{data.label}</div>
          {data.sub && <div className="truncate text-[11px] text-muted">{data.sub}</div>}
        </div>
      </div>
      <span
        className="mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
        style={{ color: style.color, background: style.bg }}
      >
        {data.kind}
      </span>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !border-2 !bg-surface"
        style={{ borderColor: style.color }}
      />
    </div>
  );
}

export const nodeTypes = {
  workflowNode: WorkflowNodeComponent,
};
