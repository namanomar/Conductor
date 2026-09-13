"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, ExternalLink, Loader2, RefreshCw, Unplug } from "lucide-react";
import { appMeta } from "@/lib/app-meta";
import { providerClientMeta } from "@/lib/provider-meta-client";
import type { AppId, ConnectionApiState, ConnectionMode, DataMode } from "@/lib/types";

function SegmentToggle<T extends string>({
  value,
  options,
  onChange,
  disabled,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="inline-flex rounded-full border border-border-soft bg-surface-2 p-0.5 text-xs">
      {options.map((opt) => (
        <button
          key={opt.value}
          disabled={disabled}
          onClick={() => onChange(opt.value)}
          className={`rounded-full px-3 py-1 font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
            value === opt.value
              ? "bg-foreground text-background"
              : "text-muted hover:text-foreground"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

async function api<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export function ConnectionCard({
  connection,
  onChange,
}: {
  connection: ConnectionApiState;
  onChange: (next: ConnectionApiState) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configDraft, setConfigDraft] = useState(connection.config ?? "");
  const [mcpToken, setMcpToken] = useState("");
  const [directFields, setDirectFields] = useState({ token: "", apiKey: "", siteUrl: "", email: "", apiToken: "" });
  const [syncInfo, setSyncInfo] = useState<string | null>(null);
  const [channels, setChannels] = useState<{ id: string; name: string; isMember: boolean }[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);

  const meta = appMeta[connection.id];
  const provider = providerClientMeta[connection.id];
  const Icon = meta.icon;

  const loadChannels = async () => {
    setLoadingChannels(true);
    setError(null);
    try {
      const data = await api<{ channels: { id: string; name: string; isMember: boolean }[] }>(
        "/api/connections/slack/channels"
      );
      setChannels(data.channels);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to list channels");
    } finally {
      setLoadingChannels(false);
    }
  };

  useEffect(() => {
    if (connection.id === "slack" && connection.connected) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadChannels();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection.id, connection.connected]);

  const patch = async (body: Partial<{ mode: ConnectionMode; dataMode: DataMode; config: string }>) => {
    setError(null);
    try {
      const data = await api<{ connection: ConnectionApiState }>(`/api/connections/${connection.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      onChange({ ...connection, ...data.connection });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  };

  const disconnect = async () => {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/connections/${connection.id}`, { method: "DELETE" });
      onChange({ ...connection, connected: false, credentialType: undefined });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Disconnect failed");
    } finally {
      setBusy(false);
    }
  };

  const connectOAuth = () => {
    window.location.href = `/api/connections/${connection.id}/oauth/start`;
  };

  const connectDirect = async () => {
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, string> =
        connection.id === "pagerduty"
          ? { apiKey: directFields.apiKey }
          : connection.id === "jira"
          ? { siteUrl: directFields.siteUrl, email: directFields.email, apiToken: directFields.apiToken }
          : { token: directFields.token };
      await api(`/api/connections/${connection.id}/direct`, { method: "POST", body: JSON.stringify(body) });
      onChange({ ...connection, connected: true, credentialType: "api_key" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setBusy(false);
    }
  };

  const connectMcp = async () => {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/connections/${connection.id}/mcp`, {
        method: "POST",
        body: JSON.stringify({ token: mcpToken }),
      });
      onChange({ ...connection, connected: true, credentialType: "mcp_token" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "MCP connection failed");
    } finally {
      setBusy(false);
    }
  };

  const runSync = async () => {
    setBusy(true);
    setError(null);
    setSyncInfo(null);
    try {
      const data = await api<{ count: number; syncedAt: string }>(`/api/connections/${connection.id}/sync`, {
        method: "POST",
      });
      setSyncInfo(`Synced ${data.count} item(s) into MongoDB`);
      onChange({ ...connection, lastSyncedAt: data.syncedAt });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      layout
      className="card-hover rounded-2xl border border-border bg-surface p-5"
      style={{ borderColor: connection.connected ? meta.color + "55" : undefined }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: meta.bg }}>
            <Icon className="h-5 w-5" style={{ color: meta.color }} />
          </span>
          <div>
            <div className="text-sm font-medium">{meta.label}</div>
            <div className="text-xs text-muted">
              {provider.mcpOnly || connection.mode === "mcp"
                ? provider.mcpEndpoint
                : provider.supportsOAuth
                ? "OAuth"
                : "API key"}
            </div>
          </div>
        </div>

        <span
          className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium"
          style={{
            borderColor: connection.connected ? "var(--success)" : "var(--border)",
            color: connection.connected ? "var(--success)" : "var(--muted)",
            background: connection.connected ? "color-mix(in srgb, var(--success) 12%, transparent)" : "transparent",
          }}
        >
          {connection.connected ? (
            <>
              <Check className="h-3 w-3" /> Connected
            </>
          ) : (
            "Not connected"
          )}
        </span>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">Connection type</div>
          {provider.mcpOnly ? (
            <span className="inline-flex rounded-full border border-border-soft bg-surface-2 px-3 py-1 text-xs font-medium text-muted">
              MCP only
            </span>
          ) : (
            <SegmentToggle<ConnectionMode>
              value={connection.mode}
              disabled={connection.connected}
              onChange={(mode) => patch({ mode })}
              options={[
                { value: "direct", label: provider.supportsOAuth ? "OAuth" : "Direct" },
                { value: "mcp", label: "MCP" },
              ]}
            />
          )}
        </div>

        <div>
          <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">Data mode</div>
          <SegmentToggle<DataMode>
            value={connection.dataMode}
            onChange={(dataMode) => patch({ dataMode })}
            options={[
              { value: "live", label: "Live" },
              { value: "synced", label: "Synced" },
            ]}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <input
          value={configDraft}
          onChange={(e) => setConfigDraft(e.target.value)}
          onBlur={() => configDraft !== connection.config && patch({ config: configDraft })}
          placeholder={provider.configPlaceholder}
          className="w-full rounded-lg border border-border-soft bg-surface-2 px-3 py-1.5 text-xs outline-none focus:border-accent-2"
        />
        <span className="shrink-0 text-[11px] text-muted">{provider.configLabel}</span>
      </div>

      {connection.id === "slack" && connection.connected && (
        <div className="mt-2 flex items-center gap-2">
          <select
            value={channels.some((c) => c.id === configDraft) ? configDraft : ""}
            onChange={(e) => {
              if (!e.target.value) return;
              setConfigDraft(e.target.value);
              patch({ config: e.target.value });
            }}
            className="w-full rounded-lg border border-border-soft bg-surface-2 px-3 py-1.5 text-xs outline-none focus:border-accent-2"
          >
            <option value="">
              {loadingChannels ? "Loading channels…" : channels.length ? "Or pick a channel…" : "No channels found"}
            </option>
            {channels.map((c) => (
              <option key={c.id} value={c.id}>
                #{c.name}
                {c.isMember ? "" : " (bot not in channel)"}
              </option>
            ))}
          </select>
          <button
            onClick={loadChannels}
            disabled={loadingChannels}
            title="Refresh channel list"
            className="shrink-0 rounded-lg border border-border bg-surface-2 p-2 text-muted transition hover:text-foreground disabled:opacity-50"
          >
            {loadingChannels ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </button>
        </div>
      )}

      {!connection.connected && (
        <div className="mt-4 space-y-2 border-t border-border-soft pt-4">
          {connection.mode === "mcp" ? (
            <div className="flex items-center gap-2">
              <input
                value={mcpToken}
                onChange={(e) => setMcpToken(e.target.value)}
                type="password"
                placeholder="MCP access token"
                className="w-full rounded-lg border border-border-soft bg-surface-2 px-3 py-1.5 text-xs outline-none focus:border-accent-2"
              />
              <button
                onClick={connectMcp}
                disabled={busy || !mcpToken}
                className="shrink-0 rounded-lg bg-foreground px-4 py-1.5 text-xs font-medium text-background transition hover:opacity-90 disabled:opacity-40"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Connect"}
              </button>
            </div>
          ) : connection.id === "pagerduty" ? (
            <div className="flex items-center gap-2">
              <input
                value={directFields.apiKey}
                onChange={(e) => setDirectFields((f) => ({ ...f, apiKey: e.target.value }))}
                type="password"
                placeholder="PagerDuty API key"
                className="w-full rounded-lg border border-border-soft bg-surface-2 px-3 py-1.5 text-xs outline-none focus:border-accent-2"
              />
              <button
                onClick={connectDirect}
                disabled={busy || !directFields.apiKey}
                className="shrink-0 rounded-lg bg-foreground px-4 py-1.5 text-xs font-medium text-background transition hover:opacity-90 disabled:opacity-40"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Connect"}
              </button>
            </div>
          ) : connection.id === "slack" ? (
            <div className="flex items-center gap-2">
              <input
                value={directFields.token}
                onChange={(e) => setDirectFields((f) => ({ ...f, token: e.target.value }))}
                type="password"
                placeholder="Slack bot token (xoxb-...)"
                className="w-full rounded-lg border border-border-soft bg-surface-2 px-3 py-1.5 text-xs outline-none focus:border-accent-2"
              />
              <button
                onClick={connectDirect}
                disabled={busy || !directFields.token}
                className="shrink-0 rounded-lg bg-foreground px-4 py-1.5 text-xs font-medium text-background transition hover:opacity-90 disabled:opacity-40"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Connect"}
              </button>
            </div>
          ) : connection.id === "jira" ? (
            <div className="space-y-2">
              <input
                value={directFields.siteUrl}
                onChange={(e) => setDirectFields((f) => ({ ...f, siteUrl: e.target.value }))}
                placeholder="https://yoursite.atlassian.net"
                className="w-full rounded-lg border border-border-soft bg-surface-2 px-3 py-1.5 text-xs outline-none focus:border-accent-2"
              />
              <div className="flex items-center gap-2">
                <input
                  value={directFields.email}
                  onChange={(e) => setDirectFields((f) => ({ ...f, email: e.target.value }))}
                  placeholder="you@company.com"
                  className="w-full rounded-lg border border-border-soft bg-surface-2 px-3 py-1.5 text-xs outline-none focus:border-accent-2"
                />
                <input
                  value={directFields.apiToken}
                  onChange={(e) => setDirectFields((f) => ({ ...f, apiToken: e.target.value }))}
                  type="password"
                  placeholder="API token"
                  className="w-full rounded-lg border border-border-soft bg-surface-2 px-3 py-1.5 text-xs outline-none focus:border-accent-2"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={connectOAuth}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-accent-2 hover:underline"
                >
                  <ExternalLink className="h-3 w-3" /> or connect with OAuth instead
                </button>
                <button
                  onClick={connectDirect}
                  disabled={busy || !directFields.siteUrl || !directFields.email || !directFields.apiToken}
                  className="shrink-0 rounded-lg bg-foreground px-4 py-1.5 text-xs font-medium text-background transition hover:opacity-90 disabled:opacity-40"
                >
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Connect"}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={connectOAuth}
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-foreground px-4 py-2 text-xs font-medium text-background transition hover:opacity-90 disabled:opacity-40"
            >
              Connect with OAuth
            </button>
          )}
        </div>
      )}

      {connection.connected && (
        <div className="mt-4 flex items-center justify-between border-t border-border-soft pt-4">
          <span className="text-xs text-muted">
            {connection.dataMode === "synced"
              ? connection.lastSyncedAt
                ? `Synced ${new Date(connection.lastSyncedAt).toLocaleTimeString()}`
                : "Not synced yet"
              : "Querying live"}
          </span>
          <div className="flex items-center gap-2">
            {connection.dataMode === "synced" && (
              <button
                onClick={runSync}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium transition hover:text-accent-2"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Sync now
              </button>
            )}
            <button
              onClick={disconnect}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-muted transition hover:text-danger"
            >
              <Unplug className="h-3.5 w-3.5" />
              Disconnect
            </button>
          </div>
        </div>
      )}

      {syncInfo && <p className="mt-2 text-[11px] text-success">{syncInfo}</p>}
      {error && <p className="mt-2 text-[11px] text-danger">{error}</p>}
    </motion.div>
  );
}
