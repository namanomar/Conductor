"use client";

import { motion } from "framer-motion";
import { Eye, Search, Brain, Zap, ShieldCheck } from "lucide-react";

const steps = [
  { icon: Eye, title: "Observe", body: "PagerDuty fires a SEV-1 for checkout-api." },
  { icon: Search, title: "Investigate", body: "Search Slack, GitHub, and Jira for context." },
  { icon: Brain, title: "Reason", body: "Build an evidence graph, form a root-cause hypothesis." },
  { icon: Zap, title: "Act", body: "Propose actions, wait for human approval, execute." },
  { icon: ShieldCheck, title: "Verify", body: "Re-fetch every action's target to confirm it worked." },
];

export function AgentLoop() {
  return (
    <section id="loop" className="relative border-t border-border-soft py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-14">
          <span className="text-xs font-semibold uppercase tracking-widest text-accent-2">
            How it works
          </span>
          <h2 className="mt-3 whitespace-nowrap text-[clamp(1.05rem,4.4vw,2.25rem)] font-medium tracking-tight">
            Observe → Investigate → Reason → Act → Verify
          </h2>
          <p className="mt-4 max-w-2xl text-muted">
            The same loop drives every workflow on Conductor. Nothing gets
            marked done until it&apos;s independently verified.
          </p>
        </div>

        <div className="relative grid gap-6 sm:grid-cols-5">
          <div className="absolute left-0 right-0 top-6 hidden h-px bg-border sm:block" />
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: i * 0.1 }}
                className="relative flex flex-col items-center text-center sm:items-start sm:text-left"
              >
                <div className="card-hover relative z-10 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface">
                  <Icon className="h-5 w-5 text-accent-2" />
                </div>
                <div className="mt-4 text-sm font-medium">
                  {i + 1}. {s.title}
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-muted">{s.body}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
