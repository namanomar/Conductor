"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Brain, GitPullRequest, Loader2, MessageSquare, Plug, ShieldCheck, Ticket, UserCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { paletteItems, type PaletteItem } from "@/lib/workflow-templates";
import { kindStyle } from "./nodes";

interface WorkflowToolNode {
  sourceId: string;
  sourceLabel: string;
  toolName: string;
  description?: string;
}

const iconMap: Record<string, LucideIcon> = {
  alert: AlertTriangle,
  slack: MessageSquare,
  github: GitPullRequest,
  jira: Ticket,
  brain: Brain,
  approve: UserCheck,
  verify: ShieldCheck,
  tool: Plug,
};

const groups: { title: string; kinds: PaletteItem["kind"][] }[] = [
  { title: "Trigger", kinds: ["trigger"] },
  { title: "Investigate", kinds: ["investigate"] },
  { title: "Reason", kinds: ["reason"] },
  { title: "Approval", kinds: ["approval"] },
  { title: "Action", kinds: ["action"] },
  { title: "Verify", kinds: ["verify"] },
];

function PaletteBlock({
  icon: Icon,
  color,
  bg,
  label,
  onDragStart,
}: {
  icon: LucideIcon;
  color: string;
  bg: string;
  label: string;
  onDragStart: (e: React.DragEvent) => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex cursor-grab items-center gap-2.5 rounded-lg border border-border-soft bg-surface px-3 py-2 text-xs font-medium transition hover:border-muted hover:-translate-y-px active:cursor-grabbing"
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md" style={{ background: bg }}>
        <Icon className="h-3.5 w-3.5" style={{ color }} />
      </span>
      <span className="truncate">{label}</span>
    </div>
  );
}

export function NodePalette() {
  const [tools, setTools] = useState<WorkflowToolNode[]>([]);
  const [loadingTools, setLoadingTools] = useState(true);

  useEffect(() => {
    fetch("/api/workflow-tools")
      .then((r) => r.json())
      .then((d) => setTools(d.tools ?? []))
      .catch(() => setTools([]))
      .finally(() => setLoadingTools(false));
  }, []);

  const onDragStart = (event: React.DragEvent, item: PaletteItem) => {
    event.dataTransfer.setData("application/conductor-node", JSON.stringify(item));
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <aside className="w-64 shrink-0 overflow-y-auto border-r border-border-soft bg-surface/60 p-4">
      <h2 className="mb-1 text-sm font-medium">Node palette</h2>
      <p className="mb-4 text-xs text-muted">Drag a block onto the canvas.</p>

      <div className="space-y-5">
        {groups.map((group) => (
          <div key={group.title}>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
              {group.title}
            </div>
            <div className="space-y-2">
              {paletteItems
                .filter((item) => group.kinds.includes(item.kind))
                .map((item) => {
                  const style = kindStyle[item.kind];
                  return (
                    <PaletteBlock
                      key={item.id}
                      icon={iconMap[item.icon]}
                      color={style.color}
                      bg={style.bg}
                      label={item.label}
                      onDragStart={(e) => onDragStart(e, item)}
                    />
                  );
                })}
            </div>
          </div>
        ))}

        <div>
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
            Connected tools (MCP)
            {loadingTools && <Loader2 className="h-3 w-3 animate-spin" />}
          </div>
          <div className="space-y-2">
            {!loadingTools && tools.length === 0 && (
              <p className="text-[11px] leading-relaxed text-muted">
                No MCP tools available yet — connect an app via MCP mode, or add a custom
                connection, on the Connections page.
              </p>
            )}
            {tools.map((t) => {
              const style = kindStyle.tool;
              const item: PaletteItem = {
                id: `tool-${t.sourceId}-${t.toolName}`,
                label: t.toolName,
                sub: t.sourceLabel,
                kind: "tool",
                icon: "tool",
                sourceId: t.sourceId,
                toolName: t.toolName,
              };
              return (
                <div key={item.id} title={t.description}>
                  <PaletteBlock
                    icon={Plug}
                    color={style.color}
                    bg={style.bg}
                    label={`${t.sourceLabel}: ${t.toolName}`}
                    onDragStart={(e) => onDragStart(e, item)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
