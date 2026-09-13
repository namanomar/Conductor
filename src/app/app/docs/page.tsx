"use client";

import {
  AlertTriangle,
  Copy,
  ExternalLink,
  GitPullRequest,
  MessageSquare,
  Puzzle,
  Ticket,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

function CopyField({ value }: { value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border-soft bg-surface-2 px-3 py-2">
      <code className="flex-1 truncate font-mono text-xs text-accent-2">{value}</code>
      <button
        onClick={() => navigator.clipboard?.writeText(value)}
        className="shrink-0 text-muted transition hover:text-foreground"
        title="Copy"
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function Step({ children }: { children: React.ReactNode }) {
  return <li className="pl-1 text-sm leading-relaxed text-foreground/90">{children}</li>;
}

function DocSection({
  icon: Icon,
  color,
  bg,
  title,
  subtitle,
  children,
}: {
  icon: LucideIcon;
  color: string;
  bg: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: bg }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </span>
        <div>
          <h2 className="text-base font-medium">{title}</h2>
          <p className="text-xs text-muted">{subtitle}</p>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export default function DocsPage() {
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const cb = (path: string) => `${origin}${path}`;

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <div className="mb-8">
        <h1 className="text-xl font-medium">Connection setup</h1>
        <p className="mt-1 text-sm text-muted">
          How to connect each app. Nothing here is required to explore the UI — connect only
          what you need for your demo, and anything unconnected just shows a clear error where
          it&apos;s needed instead of blocking the rest.
        </p>
      </div>

      <div className="space-y-6">
        <DocSection
          icon={AlertTriangle}
          color="#6fae7d"
          bg="rgba(111,174,125,0.12)"
          title="PagerDuty"
          subtitle="Direct connection — API key, no OAuth app needed"
        >
          <ol className="list-decimal space-y-2 pl-5">
            <Step>
              PagerDuty → <strong>Integrations → API Access Keys</strong> → create a key. A
              general account-level key works fine.
            </Step>
            <Step>
              On the <strong>Connections</strong> page, paste it into the PagerDuty card and click{" "}
              <strong>Connect</strong>.
            </Step>
            <Step>
              Optionally set <strong>Service ID</strong> to scope incident lookups to one
              service — leave blank to check the whole account.
            </Step>
          </ol>
          <p className="text-xs text-muted">
            No env var needed — the key is entered directly in the UI and encrypted in MongoDB.
          </p>
        </DocSection>

        <DocSection
          icon={MessageSquare}
          color="#c1876e"
          bg="rgba(193,135,110,0.12)"
          title="Slack"
          subtitle="Direct connection — bot token"
        >
          <ol className="list-decimal space-y-2 pl-5">
            <Step>
              <a
                href="https://api.slack.com/apps"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-accent-2 hover:underline"
              >
                api.slack.com/apps <ExternalLink className="h-3 w-3" />
              </a>{" "}
              → <strong>Create New App</strong> → From scratch.
            </Step>
            <Step>
              Under <strong>OAuth &amp; Permissions</strong>, add bot token scopes:{" "}
              <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">channels:read</code>,{" "}
              <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">channels:history</code>,{" "}
              <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">chat:write</code>.
            </Step>
            <Step>
              <strong>Install App to Workspace</strong>, then copy the{" "}
              <strong>Bot User OAuth Token</strong> (starts <code>xoxb-</code>).
            </Step>
            <Step>
              On the Connections page, set Slack to <strong>Direct</strong> mode, paste the
              token, and click <strong>Connect</strong>.
            </Step>
            <Step>
              In Slack, invite the bot to whichever channel you want to use:{" "}
              <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">/invite @YourAppName</code>
              . Use the channel picker on the Connections card to confirm it shows as a member.
            </Step>
          </ol>
        </DocSection>

        <DocSection
          icon={GitPullRequest}
          color="#98a2ae"
          bg="rgba(152,162,174,0.12)"
          title="GitHub"
          subtitle="Direct connection — OAuth app"
        >
          <ol className="list-decimal space-y-2 pl-5">
            <Step>
              <a
                href="https://github.com/settings/developers"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-accent-2 hover:underline"
              >
                github.com/settings/developers <ExternalLink className="h-3 w-3" />
              </a>{" "}
              → OAuth Apps → <strong>New OAuth App</strong>.
            </Step>
            <Step>Set the Authorization callback URL to exactly:</Step>
          </ol>
          <CopyField value={cb("/api/connections/github/oauth/callback")} />
          <ol className="list-decimal space-y-2 pl-5" start={3}>
            <Step>
              Copy the <strong>Client ID</strong>, generate and copy a{" "}
              <strong>Client Secret</strong>.
            </Step>
            <Step>
              Add to <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">.env.local</code>:{" "}
              <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">GITHUB_CLIENT_ID</code> /{" "}
              <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">GITHUB_CLIENT_SECRET</code>
              , then restart the dev server.
            </Step>
            <Step>
              Connections page → GitHub → <strong>Connect with OAuth</strong>, approve, then set
              the <strong>Repository</strong> field to <code>owner/repo</code>.
            </Step>
          </ol>
        </DocSection>

        <DocSection
          icon={Ticket}
          color="#6f9c96"
          bg="rgba(111,156,150,0.12)"
          title="Jira / Atlassian"
          subtitle="Direct connection — OAuth app, or an API token"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Option A — OAuth</p>
          <ol className="list-decimal space-y-2 pl-5">
            <Step>
              <a
                href="https://developer.atlassian.com/console/myapps/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-accent-2 hover:underline"
              >
                developer.atlassian.com/console/myapps <ExternalLink className="h-3 w-3" />
              </a>{" "}
              → Create app → OAuth 2.0 integration.
            </Step>
            <Step>Set the callback URL to exactly:</Step>
          </ol>
          <CopyField value={cb("/api/connections/jira/oauth/callback")} />
          <ol className="list-decimal space-y-2 pl-5" start={3}>
            <Step>
              Add scopes: <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">read:jira-work</code>,{" "}
              <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">write:jira-work</code>,{" "}
              <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">offline_access</code>.
            </Step>
            <Step>
              Add <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">JIRA_CLIENT_ID</code> /{" "}
              <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">JIRA_CLIENT_SECRET</code>{" "}
              to <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">.env.local</code> and
              restart.
            </Step>
          </ol>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Option B — API token (no OAuth app)</p>
          <p className="text-sm text-muted">
            On the Connections page, switch Jira to Direct mode and fill in your Atlassian site
            URL (<code className="rounded bg-surface-2 px-1 py-0.5 text-xs">https://yoursite.atlassian.net</code>),
            your account email, and an API token from{" "}
            <a
              href="https://id.atlassian.com/manage-profile/security/api-tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-accent-2 hover:underline"
            >
              id.atlassian.com <ExternalLink className="h-3 w-3" />
            </a>
            .
          </p>
          <p className="text-sm text-muted">
            Either way, set the <strong>Project key</strong> field (e.g. <code>PROJ</code>) once
            connected.
          </p>
        </DocSection>

        <DocSection
          icon={Puzzle}
          color="#c6a15b"
          bg="rgba(198,161,91,0.12)"
          title="Custom connections"
          subtitle="Any other MCP-exposed tool — by token or OAuth"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Access token</p>
          <p className="text-sm text-muted">
            On the Connections page, under <strong>Custom connections → Add custom
            connection</strong>, pick the <strong>Access token</strong> mode. Enter a name, the
            MCP server URL (e.g. <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">https://mcp.example.com/mcp</code>),
            and a bearer token the server accepts. Conductor validates it live by listing its
            tools before saving.
          </p>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">OAuth</p>
          <p className="text-sm text-muted">
            Some providers (e.g. Notion) only accept a token minted through their own OAuth
            flow — a plain token pasted in will be rejected. Pick the <strong>OAuth</strong>{" "}
            mode instead, register this exact redirect URI in the provider&apos;s OAuth app
            settings first:
          </p>
          <CopyField value={cb("/api/custom-connections/oauth/callback")} />
          <p className="text-sm text-muted">
            Then fill in the provider&apos;s Authorize URL, Token URL, Client ID, and Client
            Secret, and click <strong>Connect with OAuth</strong>.
          </p>
        </DocSection>
      </div>
    </div>
  );
}
