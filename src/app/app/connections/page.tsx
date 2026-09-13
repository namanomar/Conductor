"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { ConnectionCard } from "@/components/connections/ConnectionCard";
import { CustomConnections } from "@/components/connections/CustomConnections";
import type { ConnectionApiState } from "@/lib/types";

export default function ConnectionsPage() {
  return (
    <Suspense fallback={null}>
      <ConnectionsPageInner />
    </Suspense>
  );
}

function ConnectionsPageInner() {
  const [connections, setConnections] = useState<ConnectionApiState[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  const connectedBanner = searchParams.get("connected");
  const errorBanner = searchParams.get("error");
  const errorApp = searchParams.get("app");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/connections");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load connections");
      setConnections(data.connections);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load connections");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connectedCount = connections.filter((c) => c.connected).length;

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium">Connections</h1>
          <p className="mt-1 text-sm text-muted">
            Wire up each app via OAuth or a hosted MCP server, and choose whether Conductor
            queries it live or keeps a synced copy in MongoDB.
          </p>
        </div>
        <span className="rounded-full border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-muted">
          {connectedCount}/{connections.length || 4} connected
        </span>
      </div>

      {connectedBanner && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" />
          {connectedBanner} connected successfully.
        </div>
      )}
      {errorBanner && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          <XCircle className="h-4 w-4" />
          {errorApp ? `${errorApp}: ` : ""}
          {errorBanner}
        </div>
      )}
      {loadError && (
        <div className="mb-6 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {loadError}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted">Loading connections…</p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {connections.map((connection) => (
            <ConnectionCard
              key={connection.id}
              connection={connection}
              onChange={(next) =>
                setConnections((prev) => prev.map((c) => (c.id === next.id ? next : c)))
              }
            />
          ))}
        </div>
      )}

      <CustomConnections />

      <p className="mt-8 text-xs text-muted">
        Connection settings and credentials are encrypted and stored securely — nothing is
        shared between workspaces.
      </p>
    </div>
  );
}
