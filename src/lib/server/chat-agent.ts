import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { getOpenAI, OPENAI_MODEL } from "./openai";
import { chatTools, executeChatTool, type ToolCallResult } from "./chat-tools";
import { getDynamicMcpTools, isDynamicMcpTool, callDynamicMcpTool } from "./dynamic-mcp-tools";

export type ChatEvent =
  | { type: "tool_start"; id: string; name: string; args: Record<string, unknown> }
  | { type: "tool_done"; id: string; name: string; ok: boolean; data?: unknown; error?: string }
  | { type: "message"; content: string }
  | { type: "error"; message: string }
  | { type: "done" };

const SYSTEM_PROMPT = `You are the Conductor assistant. You can act on the user's connected apps — PagerDuty, Slack, GitHub, and Jira — using the tools available to you.

Rules:
- Actually call tools to accomplish requests instead of just describing what you would do.
- If you're not sure what's connected, call list_connections first.
- Some tools are prefixed like "[Name via MCP]" — these come from the user's own MCP-connected or custom-connected tools (anything beyond PagerDuty/Slack/GitHub/Jira). Use them the same way as the built-in ones whenever they're relevant to the request.
- If a tool fails because an app isn't connected or isn't configured, tell the user plainly what's missing and how to fix it (the Connections page) — don't pretend it worked.
- Never fabricate data. Only report what tools actually returned.

How to present tool results — this is important:
- Never dump raw records, IDs, or timestamps at the user. Tool output is your research material, not your answer.
- Write a short natural-language summary of what you found, the way a colleague would report back after checking something — e.g. "Alex and Priya were discussing the checkout bug about an hour ago; no fix mentioned yet" not a numbered list of message objects.
- Skip anything irrelevant to what the user asked (join/leave events, empty results, bot noise) — don't mention there was nothing to report unless that itself is the answer.
- Only quote a specific message, PR title, or incident name verbatim if it's genuinely useful context; otherwise paraphrase.
- Keep it to 2-4 sentences unless the user is asking for a list on purpose (e.g. "list every open incident").`;

const MAX_ITERATIONS = 6;

export async function runChatAgent(
  history: { role: "user" | "assistant"; content: string }[],
  emit: (event: ChatEvent) => void
) {
  const openai = getOpenAI();
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.map((m) => ({ role: m.role, content: m.content }) as ChatCompletionMessageParam),
  ];

  const { tools: dynamicTools, index: dynamicIndex } = await getDynamicMcpTools();
  const tools = [...chatTools, ...dynamicTools];

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages,
      tools,
    });

    const choice = completion.choices[0];
    const message = choice.message;

    if (!message.tool_calls || message.tool_calls.length === 0) {
      emit({ type: "message", content: message.content ?? "" });
      emit({ type: "done" });
      return;
    }

    messages.push(message);

    for (const call of message.tool_calls) {
      if (call.type !== "function") continue;
      const name = call.function.name;
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(call.function.arguments || "{}");
      } catch {
        // leave args empty if the model produced malformed JSON
      }

      emit({ type: "tool_start", id: call.id, name, args });
      const result: ToolCallResult = isDynamicMcpTool(name)
        ? await callDynamicMcpTool(dynamicIndex, name, args)
            .then((data): ToolCallResult => ({ ok: true, data }))
            .catch((err): ToolCallResult => ({ ok: false, error: err instanceof Error ? err.message : "MCP tool call failed" }))
        : await executeChatTool(name, args);
      emit({ type: "tool_done", id: call.id, name, ok: result.ok, data: result.data, error: result.error });

      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result.ok ? result.data ?? {} : { error: result.error }),
      });
    }
  }

  emit({ type: "message", content: "I've made several tool calls but couldn't finish — try narrowing your request." });
  emit({ type: "done" });
}
