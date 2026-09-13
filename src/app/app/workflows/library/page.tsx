"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Trash2, Workflow as WorkflowIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface SavedWorkflow {
  _id: string;
  name: string;
  nodes: unknown[];
  edges: unknown[];
  createdAt: string;
  updatedAt: string;
}

export default function WorkflowLibraryPage() {
  const [workflows, setWorkflows] = useState<SavedWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/workflows");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setWorkflows(data.workflows);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load workflows");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  const remove = async (id: string) => {
    setWorkflows((prev) => prev.filter((w) => w._id !== id));
    await fetch(`/api/workflows/${id}`, { method: "DELETE" }).catch(() => {});
  };

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium">Workflow library</h1>
          <p className="mt-1 text-sm text-muted">
            Every workflow you&apos;ve saved from the builder — reopen one to keep editing, or
            start a fresh canvas.
          </p>
        </div>
        <Link href="/app/workflows">
          <Button variant="primary" size="sm">
            <WorkflowIcon className="h-3.5 w-3.5" />
            New workflow
          </Button>
        </Link>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : workflows.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-10 text-center">
          <p className="text-sm text-muted">
            No saved workflows yet.{" "}
            <Link href="/app/workflows" className="text-accent-2 hover:underline">
              Build one
            </Link>{" "}
            and click Save.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {workflows.map((w, i) => (
            <motion.div
              key={w._id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.03 }}
              className="card-hover flex flex-col justify-between rounded-2xl border border-border bg-surface p-4"
            >
              <div>
                <div className="text-sm font-medium">{w.name}</div>
                <div className="mt-1 text-xs text-muted">
                  {w.nodes.length} node{w.nodes.length === 1 ? "" : "s"} · updated{" "}
                  {new Date(w.updatedAt).toLocaleString()}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Link href={`/app/workflows?load=${w._id}`} className="flex-1">
                  <Button variant="secondary" size="sm" className="w-full">
                    Open
                  </Button>
                </Link>
                <button
                  onClick={() => remove(w._id)}
                  className="rounded-lg border border-border bg-surface-2 p-2 text-muted transition hover:text-danger"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
