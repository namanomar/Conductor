"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Copy, Loader2, Plug, Plus, Puzzle, Unplug, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface CustomConnection {
  id: string;
  name: string;
  endpoint: string;
  toolCount: number;
  createdAt: string;
  authType: "token" | "oauth";
}

type AuthMode = "token" | "oauth";

const REDIRECT_URI_PATH = "/api/custom-connections/oauth/callback";

export function CustomConnections() {
  const [connections, setConnections] = useState<CustomConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState<AuthMode>("token");
  const [form, setForm] = useState({
    name: "",
    endpoint: "",
    token: "",
    authorizeUrl: "",
    tokenUrl: "",
    clientId: "",
    clientSecret: "",
    scopes: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/custom-connections");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setConnections(data.connections);
    } catch {
      // shown inline where relevant; a failed list load just leaves the section empty
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  const resetForm = () => {
    setForm({ name: "", endpoint: "", token: "", authorizeUrl: "", tokenUrl: "", clientId: "", clientSecret: "", scopes: "" });
    setShowForm(false);
    setMode("token");
  };

  const addWithToken = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/custom-connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, endpoint: form.endpoint, token: form.token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setConnections((prev) => [data.connection, ...prev]);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add connection");
    } finally {
      setBusy(false);
    }
  };

  const connectWithOAuth = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/custom-connections/oauth/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          endpoint: form.endpoint,
          authorizeUrl: form.authorizeUrl,
          tokenUrl: form.tokenUrl,
          clientId: form.clientId,
          clientSecret: form.clientSecret,
          scopes: form.scopes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = data.authorizeUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start OAuth flow");
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setConnections((prev) => prev.filter((c) => c.id !== id));
    await fetch(`/api/custom-connections/${id}`, { method: "DELETE" }).catch(() => {});
  };

  const redirectUri = typeof window !== "undefined" ? `${window.location.origin}${REDIRECT_URI_PATH}` : REDIRECT_URI_PATH;

  return (
    <div className="mt-10">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium">Custom connections</h2>
          <p className="mt-0.5 text-xs text-muted">
            Connect any other MCP-exposed tool — by a plain access token, or by OAuth if the
            provider requires it (e.g. Notion).
          </p>
        </div>
        {!showForm && (
          <Button variant="secondary" size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-3.5 w-3.5" />
            Add custom connection
          </Button>
        )}
      </div>

      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 rounded-2xl border border-border bg-surface p-5"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">New MCP connection</span>
            <button onClick={resetForm} className="text-muted hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-3 inline-flex rounded-full border border-border-soft bg-surface-2 p-0.5 text-xs">
            {(["token", "oauth"] as AuthMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-full px-3 py-1 font-medium transition ${
                  mode === m ? "bg-foreground text-background" : "text-muted hover:text-foreground"
                }`}
              >
                {m === "token" ? "Access token" : "OAuth"}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Name (e.g. Linear, Notion, internal tool)"
              className="w-full rounded-lg border border-border-soft bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent-2"
            />
            <input
              value={form.endpoint}
              onChange={(e) => setForm((f) => ({ ...f, endpoint: e.target.value }))}
              placeholder="MCP server URL, e.g. https://mcp.example.com/mcp"
              className="w-full rounded-lg border border-border-soft bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent-2"
            />

            {mode === "token" ? (
              <input
                value={form.token}
                onChange={(e) => setForm((f) => ({ ...f, token: e.target.value }))}
                type="password"
                placeholder="Access token"
                className="w-full rounded-lg border border-border-soft bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent-2"
              />
            ) : (
              <>
                <div className="rounded-lg border border-border-soft bg-surface-2 px-3 py-2 text-xs">
                  <div className="mb-1 text-muted">
                    Register this exact redirect URI in the provider&apos;s OAuth app settings first:
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 truncate font-mono text-accent-2">{redirectUri}</code>
                    <button
                      onClick={() => navigator.clipboard?.writeText(redirectUri)}
                      className="shrink-0 text-muted hover:text-foreground"
                      title="Copy"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <input
                  value={form.authorizeUrl}
                  onChange={(e) => setForm((f) => ({ ...f, authorizeUrl: e.target.value }))}
                  placeholder="Authorize URL, e.g. https://provider.com/oauth/authorize"
                  className="w-full rounded-lg border border-border-soft bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent-2"
                />
                <input
                  value={form.tokenUrl}
                  onChange={(e) => setForm((f) => ({ ...f, tokenUrl: e.target.value }))}
                  placeholder="Token URL, e.g. https://provider.com/oauth/token"
                  className="w-full rounded-lg border border-border-soft bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent-2"
                />
                <div className="flex items-center gap-2">
                  <input
                    value={form.clientId}
                    onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}
                    placeholder="Client ID"
                    className="w-full rounded-lg border border-border-soft bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent-2"
                  />
                  <input
                    value={form.clientSecret}
                    onChange={(e) => setForm((f) => ({ ...f, clientSecret: e.target.value }))}
                    type="password"
                    placeholder="Client secret"
                    className="w-full rounded-lg border border-border-soft bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent-2"
                  />
                </div>
                <input
                  value={form.scopes}
                  onChange={(e) => setForm((f) => ({ ...f, scopes: e.target.value }))}
                  placeholder="Scopes (optional, space-separated)"
                  className="w-full rounded-lg border border-border-soft bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent-2"
                />
              </>
            )}
          </div>

          {error && <p className="mt-2 text-xs text-danger">{error}</p>}

          <div className="mt-3 flex justify-end">
            {mode === "token" ? (
              <Button
                variant="accent"
                size="sm"
                onClick={addWithToken}
                disabled={busy || !form.name || !form.endpoint || !form.token}
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plug className="h-3.5 w-3.5" />}
                Connect
              </Button>
            ) : (
              <Button
                variant="accent"
                size="sm"
                onClick={connectWithOAuth}
                disabled={
                  busy ||
                  !form.name ||
                  !form.endpoint ||
                  !form.authorizeUrl ||
                  !form.tokenUrl ||
                  !form.clientId ||
                  !form.clientSecret
                }
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plug className="h-3.5 w-3.5" />}
                Connect with OAuth
              </Button>
            )}
          </div>
        </motion.div>
      )}

      {!loading && connections.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {connections.map((c) => (
            <motion.div
              key={c.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-hover flex items-center justify-between rounded-2xl border border-border bg-surface p-4"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
                  <Puzzle className="h-4.5 w-4.5 text-accent" />
                </span>
                <div>
                  <div className="text-sm font-medium">{c.name}</div>
                  <div className="text-xs text-muted">
                    {c.endpoint} · {c.toolCount} tool{c.toolCount === 1 ? "" : "s"} ·{" "}
                    {c.authType === "oauth" ? "OAuth" : "Token"}
                  </div>
                </div>
              </div>
              <button
                onClick={() => remove(c.id)}
                className="rounded-lg border border-border bg-surface-2 p-2 text-muted transition hover:text-danger"
                title="Disconnect"
              >
                <Unplug className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
