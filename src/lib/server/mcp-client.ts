import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export interface McpToolSummary {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export async function withMcpClient<T>(
  endpoint: string,
  bearerToken: string,
  fn: (client: Client) => Promise<T>
): Promise<T> {
  const transport = new StreamableHTTPClientTransport(new URL(endpoint), {
    requestInit: { headers: { Authorization: `Bearer ${bearerToken}` } },
  });
  const client = new Client({ name: "conductor", version: "0.1.0" });
  await client.connect(transport);
  try {
    return await fn(client);
  } finally {
    await client.close();
  }
}

export async function mcpListTools(endpoint: string, bearerToken: string): Promise<McpToolSummary[]> {
  return withMcpClient(endpoint, bearerToken, async (client) => {
    const result = await client.listTools();
    return result.tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema as Record<string, unknown> | undefined,
    }));
  });
}

export async function mcpCallTool(
  endpoint: string,
  bearerToken: string,
  name: string,
  args: Record<string, unknown>
) {
  return withMcpClient(endpoint, bearerToken, async (client) => {
    return client.callTool({ name, arguments: args });
  });
}
