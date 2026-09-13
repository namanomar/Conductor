"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { incidentCommanderTemplate } from "@/lib/workflow-templates";

interface RunSummary {
  _id: string;
  workflowName: string;
  status: "running" | "awaiting_approval" | "completed" | "failed";
  createdAt: string;
}

const statusStyle: Record<RunSummary["status"], string> = {
  running: "text-accent-2 border-accent-2/30 bg-accent-2/10",
  awaiting_approval: "text-warning border-warning/30 bg-warning/10",
  completed: "text-success border-success/30 bg-success/10",
  failed: "text-danger border-danger/30 bg-danger/10",
};

export default function RunsPage() {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const router = useRouter();

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/runs");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRuns(data.runs);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load runs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  const startIncidentCommanderRun = async () => {
    setStarting(true);
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Incident Commander",
          nodes: incidentCommanderTemplate.nodes,
          edges: incidentCommanderTemplate.edges,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/app/runs/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start run");
      setStarting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium">Runs</h1>
          <p className="mt-1 text-sm text-muted">
            Every workflow execution — real connector calls, an OpenAI reasoning step, and
            independent verification — logged to MongoDB.
          </p>
        </div>
        <Button variant="accent" onClick={startIncidentCommanderRun} disabled={starting}>
          {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Run Incident Commander
        </Button>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted">Loading runs…</p>
      ) : runs.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-10 text-center">
          <p className="text-sm text-muted">
            No runs yet. Connect your apps, then start a run from here or from the{" "}
            <Link href="/app/workflows" className="text-accent-2 hover:underline">
              workflow builder
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Workflow</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Started</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run, i) => (
                <motion.tr
                  key={run._id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.03 }}
                  onClick={() => router.push(`/app/runs/${run._id}`)}
                  className="cursor-pointer border-t border-border-soft bg-surface transition hover:bg-surface-2"
                >
                  <td className="px-4 py-3 font-medium">{run.workflowName}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusStyle[run.status]}`}>
                      {run.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">{new Date(run.createdAt).toLocaleString()}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
