"use client";

import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { appMeta } from "@/lib/app-meta";
import type { AppId } from "@/lib/types";

const chain: { id: AppId; note: string }[] = [
  { id: "pagerduty", note: "SEV-1 latency alert" },
  { id: "slack", note: "deploy mentioned" },
  { id: "github", note: "PR #8421 deployed" },
  { id: "jira", note: "PROJ-184 related bug" },
];

const actions = ["Slack incident update", "Jira incident created", "GitHub investigation issue"];

export function HeroPreview() {
  return (
    <div className="mx-auto max-w-4xl rounded-2xl border border-border glass-panel p-5 text-left shadow-2xl sm:p-7">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-muted">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-pulse-dot rounded-full bg-success" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          Incident Commander · Live
        </div>
        <span className="rounded-full border border-danger/30 bg-danger/10 px-2.5 py-0.5 text-xs font-medium text-danger">
          SEV-1 · checkout-api
        </span>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {chain.map((step, i) => {
          const meta = appMeta[step.id];
          const Icon = meta.icon;
          return (
            <div key={step.id} className="relative flex flex-col items-center text-center">
              {i < chain.length - 1 && (
                <div className="absolute left-1/2 top-6 hidden h-px w-full bg-border sm:block" />
              )}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 * i + 0.3, duration: 0.4 }}
                className="relative z-10 flex h-11 w-11 items-center justify-center rounded-lg border"
                style={{ background: meta.bg, borderColor: meta.color + "40" }}
              >
                <Icon className="h-4.5 w-4.5" style={{ color: meta.color }} />
              </motion.div>
              <div className="mt-2 text-xs font-medium">{meta.label}</div>
              <div className="text-[11px] text-muted">{step.note}</div>
            </div>
          );
        })}
      </div>

      <div className="mt-7 grid gap-5 border-t border-border-soft pt-5 sm:grid-cols-[1.3fr_1fr]">
        <div>
          <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">
            Root cause hypothesis
          </div>
          <p className="text-sm leading-relaxed text-foreground/90">
            Latency spike traced to <span className="font-mono text-accent-2">PR #8421</span> —
            deployed 5 min before the incident, matching known bug{" "}
            <span className="font-mono text-accent-2">PROJ-184</span>.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <div className="h-1 w-40 overflow-hidden rounded-full bg-surface-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "87%" }}
                transition={{ delay: 0.8, duration: 1 }}
                className="h-full rounded-full bg-accent"
              />
            </div>
            <span className="text-xs font-medium text-muted">87% confidence</span>
          </div>
        </div>

        <div>
          <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">
            Verified actions
          </div>
          <div className="space-y-1.5">
            {actions.map((a, i) => (
              <motion.div
                key={a}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1 + i * 0.15 }}
                className="flex items-center gap-2 text-xs"
              >
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
                <span className="text-foreground/80">{a}</span>
                <span className="ml-auto font-medium text-success">Verified</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
