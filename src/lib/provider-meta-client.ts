import type { AppId } from "./types";

export interface ProviderClientMeta {
  supportsOAuth: boolean;
  /** When true, this app only offers MCP — no Direct/OAuth option in the UI. */
  mcpOnly: boolean;
  mcpEndpoint: string;
  configLabel: string;
  configPlaceholder: string;
}

export const providerClientMeta: Record<AppId, ProviderClientMeta> = {
  github: {
    supportsOAuth: true,
    mcpOnly: false,
    mcpEndpoint: "https://api.githubcopilot.com/mcp/",
    configLabel: "Repository",
    configPlaceholder: "owner/repo",
  },
  slack: {
    supportsOAuth: false,
    mcpOnly: false,
    mcpEndpoint: "https://mcp.slack.com/mcp",
    configLabel: "Channel ID",
    configPlaceholder: "C0123456789",
  },
  jira: {
    supportsOAuth: true,
    mcpOnly: false,
    mcpEndpoint: "https://mcp.atlassian.com/v1/mcp",
    configLabel: "Project key",
    configPlaceholder: "PROJ",
  },
  pagerduty: {
    supportsOAuth: false,
    mcpOnly: false,
    mcpEndpoint: "https://mcp.pagerduty.com/mcp",
    configLabel: "Service ID",
    configPlaceholder: "PXXXXXX",
  },
};
