"use client";

import { motion } from "framer-motion";
import { Cable, GitBranch, Layers, MonitorSmartphone } from "lucide-react";

const features = [
  {
    icon: Cable,
    title: "Connections: MCP or direct",
    body:
      "Wire up any app via a standardized MCP server, or a direct API/OAuth connection when you need finer control. Every connection is pluggable — new apps show up as connection types, not one-off backend work.",
  },
  {
    icon: Layers,
    title: "Live or synced data",
    body:
      "Per connection, choose Live (query the app at run time, always fresh) or Synced (a local copy for instant queries and fast evidence graphs). Switch anytime as your workflow's needs change.",
  },
  {
    icon: GitBranch,
    title: "Drag-and-drop workflows",
    body:
      "Compose trigger → investigate → reason → act → approve → verify on a visual canvas. No orchestration code per workflow — just connect the nodes.",
  },
  {
    icon: MonitorSmartphone,
    title: "A control plane, not a chat box",
    body:
      "Timeline, evidence graph, and a verified action log — driven by whatever workflow is running. Built for operating incidents, not scrolling a transcript.",
  },
];

export function Features() {
  return (
    <section id="platform" className="relative border-t border-border-soft py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-14 max-w-2xl">
          <span className="text-xs font-semibold uppercase tracking-widest text-accent-2">
            Platform
          </span>
          <h2 className="mt-3 text-3xl font-medium tracking-tight sm:text-4xl">
            One platform. Any workflow.
          </h2>
          <p className="mt-4 text-muted">
            Incident Commander is the flagship workflow — four connections,
            one automation. The underlying platform is generic.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="card-hover group rounded-2xl border border-border bg-surface p-6"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-surface-2 transition group-hover:bg-accent/10">
                  <Icon className="h-5 w-5 text-accent-2" />
                </div>
                <h3 className="text-base font-medium">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
