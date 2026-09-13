import type { AppId } from "@/lib/types";
import { env } from "./env";

export interface ProviderMeta {
  id: AppId;
  supportsOAuth: boolean;
  /** When true, this app only offers MCP — Direct/OAuth routes refuse to run. */
  mcpOnly: boolean;
  oauthAuthorizeUrl?: string;
  oauthTokenUrl?: string;
  oauthScopes?: string;
  /** Official/vendor MCP server endpoint (Streamable HTTP or SSE). */
  mcpEndpoint: string;
  /** Human label for the config field this app needs (repo, project key, etc). */
  configLabel: string;
  configPlaceholder: string;
}

export const providers: Record<AppId, ProviderMeta> = {
  github: {
    id: "github",
    supportsOAuth: true,
    mcpOnly: false,
    oauthAuthorizeUrl: "https://github.com/login/oauth/authorize",
    oauthTokenUrl: "https://github.com/login/oauth/access_token",
    oauthScopes: "repo",
    mcpEndpoint: "https://api.githubcopilot.com/mcp/",
    configLabel: "Repository",
    configPlaceholder: "owner/repo",
  },
  slack: {
    id: "slack",
    supportsOAuth: false,
    mcpOnly: false,
    mcpEndpoint: "https://mcp.slack.com/mcp",
    configLabel: "Channel ID",
    configPlaceholder: "C0123456789",
  },
  jira: {
    id: "jira",
    supportsOAuth: true,
    mcpOnly: false,
    oauthAuthorizeUrl: "https://auth.atlassian.com/authorize",
    oauthTokenUrl: "https://auth.atlassian.com/oauth/token",
    oauthScopes: "read:jira-work write:jira-work offline_access",
    mcpEndpoint: "https://mcp.atlassian.com/v1/mcp",
    configLabel: "Project key",
    configPlaceholder: "PROJ",
  },
  pagerduty: {
    id: "pagerduty",
    supportsOAuth: false,
    mcpOnly: false,
    mcpEndpoint: "https://mcp.pagerduty.com/mcp",
    configLabel: "Service ID",
    configPlaceholder: "PXXXXXX",
  },
};

export function redirectUriFor(app: AppId): string {
  return `${env.appBaseUrl()}/api/connections/${app}/oauth/callback`;
}
