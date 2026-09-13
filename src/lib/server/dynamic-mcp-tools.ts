import type { ChatCompletionTool } from "openai/resources/chat/completions";
import { mcpListTools, mcpCallTool, type McpToolSummary } from "./mcp-client";
import { listConnectionsPublic, getConnection, getAccessToken } from "./connections-store";
import { providers } from "./providers";
import { listCustomConnectionCredentials } from "./custom-connections-store";
import type { AppId } from "@/lib/types";

interface McpSource {
  sourceId: string;
  label: string;
  endpoint: string;
  token: string;
}

interface DynamicToolEntry extends McpSource {
  toolName: string;
}

async function getMcpSources(): Promise<McpSource[]> {
  const sources: McpSource[] = [];

  const builtins = await listConnectionsPublic();
  for (const c of builtins) {
    if (c.connected && c.mode === "mcp" && c.credentialType === "mcp_token") {
      const doc = await getConnection(c.id as AppId);
      const token = doc ? getAccessToken(doc) : null;
      if (doc && token) {
        sources.push({
          sourceId: `builtin_${c.id}`,
          label: c.id,
          endpoint: providers[c.id as AppId].mcpEndpoint,
          token,
        });
      }
    }
  }

  const customs = await listCustomConnectionCredentials();
  for (const c of customs) {
    sources.push({ sourceId: `custom_${c.id}`, label: c.name, endpoint: c.endpoint, token: c.token });
  }

  return sources;
}

function sanitize(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
}

export interface DynamicMcpToolset {
  tools: ChatCompletionTool[];
  index: Map<string, DynamicToolEntry>;
}

export async function getDynamicMcpTools(): Promise<DynamicMcpToolset> {
  const sources = await getMcpSources();
  const tools: ChatCompletionTool[] = [];
  const index = new Map<string, DynamicToolEntry>();

  await Promise.all(
    sources.map(async (src) => {
      let list: McpToolSummary[] = [];
      try {
        list = await mcpListTools(src.endpoint, src.token);
      } catch {
        return; // that MCP source is unreachable right now — skip it, don't fail the whole chat
      }

      for (const t of list) {
        const fnName = `mcp__${sanitize(src.sourceId)}__${sanitize(t.name)}`;
        tools.push({
          type: "function",
          function: {
            name: fnName,
            description: `[${src.label} via MCP] ${t.description ?? t.name}`,
            parameters: (t.inputSchema as Record<string, unknown>) ?? { type: "object", properties: {} },
          },
        });
        index.set(fnName, { ...src, toolName: t.name });
      }
    })
  );

  return { tools, index };
}

export function isDynamicMcpTool(name: string): boolean {
  return name.startsWith("mcp__");
}

export async function callDynamicMcpTool(
  index: Map<string, DynamicToolEntry>,
  fnName: string,
  args: Record<string, unknown>
) {
  const entry = index.get(fnName);
  if (!entry) throw new Error(`Unknown MCP tool: ${fnName}`);
  return mcpCallTool(entry.endpoint, entry.token, entry.toolName, args);
}

export interface WorkflowToolNode {
  sourceId: string;
  sourceLabel: string;
  toolName: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

/** Client-safe listing (no tokens) of every MCP tool available to use as a
 * workflow node — from custom connections and any built-in app connected via MCP. */
export async function listWorkflowToolNodes(): Promise<WorkflowToolNode[]> {
  const sources = await getMcpSources();
  const nodes: WorkflowToolNode[] = [];

  await Promise.all(
    sources.map(async (src) => {
      let list: McpToolSummary[] = [];
      try {
        list = await mcpListTools(src.endpoint, src.token);
      } catch {
        return;
      }
      for (const t of list) {
        nodes.push({
          sourceId: src.sourceId,
          sourceLabel: src.label,
          toolName: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        });
      }
    })
  );

  return nodes;
}

/** Resolve one MCP source by id (for calling a specific tool node during a run). */
export async function callMcpSourceTool(sourceId: string, toolName: string, args: Record<string, unknown>) {
  const sources = await getMcpSources();
  const source = sources.find((s) => s.sourceId === sourceId);
  if (!source) throw new Error(`MCP connection "${sourceId}" is no longer available — reconnect it`);
  return mcpCallTool(source.endpoint, source.token, toolName, args);
}
