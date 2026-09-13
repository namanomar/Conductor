"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Clock, Loader2, Pause, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Schedule {
  id: string;
  intervalMinutes: number;
  enabled: boolean;
  lastRunAt?: string;
  nextRunAt: string;
}

const intervalOptions = [
  { label: "Every 5 min", minutes: 5 },
  { label: "Every 15 min", minutes: 15 },
  { label: "Every hour", minutes: 60 },
  { label: "Every 6 hours", minutes: 360 },
  { label: "Every day", minutes: 1440 },
];

function relativeFromNow(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  const mins = Math.round(diffMs / 60000);
  if (mins <= 0) return "any moment";
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

export function ScheduleControl({
  workflowId,
  ensureSaved,
}: {
  workflowId: string | null;
  ensureSaved: () => Promise<string>;
}) {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!workflowId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSchedule(null);
      return;
    }
    fetch(`/api/workflows/${workflowId}/schedule`)
      .then((r) => r.json())
      .then((d) => setSchedule(d.schedule ?? null))
      .catch(() => setSchedule(null));
  }, [workflowId]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const setInterval_ = async (minutes: number) => {
    setBusy(true);
    setError(null);
    try {
      const id = workflowId ?? (await ensureSaved());
      const res = await fetch(`/api/workflows/${id}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intervalMinutes: minutes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSchedule(data.schedule);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to schedule");
    } finally {
      setBusy(false);
    }
  };

  const toggle = async () => {
    if (!workflowId || !schedule) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/workflows/${workflowId}/schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !schedule.enabled }),
      });
      const data = await res.json();
      setSchedule(data.schedule);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!workflowId) return;
    setBusy(true);
    try {
      await fetch(`/api/workflows/${workflowId}/schedule`, { method: "DELETE" });
      setSchedule(null);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <Button variant="secondary" size="sm" onClick={() => setOpen((v) => !v)}>
        <Clock className="h-3.5 w-3.5" />
        {schedule?.enabled
          ? `Every ${intervalOptions.find((o) => o.minutes === schedule.intervalMinutes)?.label.replace("Every ", "") ?? `${schedule.intervalMinutes}m`}`
          : "Schedule"}
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-20 mt-2 w-56 rounded-xl border border-border bg-surface p-2 shadow-2xl"
          >
            {schedule?.enabled && (
              <div className="mb-2 rounded-lg border border-border-soft bg-surface-2 px-3 py-2 text-xs">
                <div className="flex items-center justify-between text-muted">
                  <span>Next run</span>
                  <span className="font-medium text-foreground">in {relativeFromNow(schedule.nextRunAt)}</span>
                </div>
                {schedule.lastRunAt && (
                  <div className="mt-1 flex items-center justify-between text-muted">
                    <span>Last run</span>
                    <span>{new Date(schedule.lastRunAt).toLocaleTimeString()}</span>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1">
              {intervalOptions.map((opt) => (
                <button
                  key={opt.minutes}
                  onClick={() => setInterval_(opt.minutes)}
                  disabled={busy}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-xs transition hover:bg-surface-2 ${
                    schedule?.enabled && schedule.intervalMinutes === opt.minutes ? "text-accent" : "text-foreground"
                  }`}
                >
                  {opt.label}
                  {busy && <Loader2 className="h-3 w-3 animate-spin" />}
                </button>
              ))}
            </div>

            {schedule && (
              <div className="mt-2 flex gap-1 border-t border-border-soft pt-2">
                <button
                  onClick={toggle}
                  disabled={busy}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted transition hover:bg-surface-2 hover:text-foreground"
                >
                  {schedule.enabled ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  {schedule.enabled ? "Pause" : "Resume"}
                </button>
                <button
                  onClick={remove}
                  disabled={busy}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted transition hover:bg-surface-2 hover:text-danger"
                >
                  <Trash2 className="h-3 w-3" />
                  Remove
                </button>
              </div>
            )}

            {error && <p className="mt-2 px-1 text-[11px] text-danger">{error}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
