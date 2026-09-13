import type { ChatCompletionTool } from "openai/resources/chat/completions";
import { resolveConnection } from "./auth-resolve";
import { githubCreateIssue, githubSearchRecentPRs } from "./connectors/github";
import { slackPostMessage, slackSearchChannel } from "./connectors/slack";
import { jiraCreateIssue, jiraSearchProjectIssues } from "./connectors/jira";
import { pagerdutyOpenIncidents } from "./connectors/pagerduty";
import { listConnectionsPublic } from "./connections-store";

export const chatTools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "list_connections",
      description: "List the user's connected apps, their mode (MCP/direct), and config (repo/channel/project/service). Call this first if unsure what's connected.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "pagerduty_list_incidents",
      description: "List currently open PagerDuty incidents.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "slack_search",
      description: "Search recent messages in the connected Slack channel for a keyword.",
      parameters: {
        type: "object",
        properties: { keyword: { type: "string", description: "Keyword to search for; empty for most recent messages" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "slack_post_message",
      description: "Post a message to the connected Slack channel.",
      parameters: {
        type: "object",
        properties: { text: { type: "string", description: "Message text to post" } },
        required: ["text"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "github_search_prs",
      description: "Search recent pull requests in the connected GitHub repository.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "github_create_issue",
      description: "Create an issue in the connected GitHub repository.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          body: { type: "string" },
        },
        required: ["title", "body"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "jira_search_issues",
      description: "Search recent issues in the connected Jira project.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "jira_create_issue",
      description: "Create an issue in the connected Jira project.",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string" },
          description: { type: "string" },
        },
        required: ["summary", "description"],
      },
    },
  },
];

export interface ToolCallResult {
  ok: boolean;
  data?: unknown;
  error?: string;
}

export async function executeChatTool(name: string, args: Record<string, unknown>): Promise<ToolCallResult> {
  try {
    switch (name) {
      case "list_connections": {
        const connections = await listConnectionsPublic();
        return { ok: true, data: connections };
      }
      case "pagerduty_list_incidents": {
        const { doc, token } = await resolveConnection("pagerduty");
        const incidents = await pagerdutyOpenIncidents(token, doc.config || undefined);
        return { ok: true, data: incidents };
      }
      case "slack_search": {
        const { doc, token } = await resolveConnection("slack");
        if (!doc.config) throw new Error("Set a Channel ID for Slack in Connections first");
        const messages = await slackSearchChannel(token, doc.config, String(args.keyword ?? ""));
        return { ok: true, data: messages };
      }
      case "slack_post_message": {
        const { doc, token } = await resolveConnection("slack");
        if (!doc.config) throw new Error("Set a Channel ID for Slack in Connections first");
        const res = await slackPostMessage(token, doc.config, String(args.text ?? ""));
        return { ok: true, data: res };
      }
      case "github_search_prs": {
        const { doc, token } = await resolveConnection("github");
        if (!doc.config) throw new Error("Set a Repository for GitHub in Connections first");
        const prs = await githubSearchRecentPRs(token, doc.config);
        return { ok: true, data: prs };
      }
      case "github_create_issue": {
        const { doc, token } = await resolveConnection("github");
        if (!doc.config) throw new Error("Set a Repository for GitHub in Connections first");
        const res = await githubCreateIssue(token, doc.config, String(args.title ?? ""), String(args.body ?? ""));
        return { ok: true, data: res };
      }
      case "jira_search_issues": {
        const { doc, jiraAuth } = await resolveConnection("jira");
        if (!doc.config || !jiraAuth) throw new Error("Set a Project key for Jira in Connections first");
        const issues = await jiraSearchProjectIssues(jiraAuth, doc.config);
        return { ok: true, data: issues };
      }
      case "jira_create_issue": {
        const { doc, jiraAuth } = await resolveConnection("jira");
        if (!doc.config || !jiraAuth) throw new Error("Set a Project key for Jira in Connections first");
        const res = await jiraCreateIssue(jiraAuth, doc.config, String(args.summary ?? ""), String(args.description ?? ""));
        return { ok: true, data: res };
      }
      default:
        return { ok: false, error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Tool call failed" };
  }
}
