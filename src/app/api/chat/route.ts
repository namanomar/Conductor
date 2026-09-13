import { runChatAgent } from "@/lib/server/chat-agent";
import { requireUserId } from "@/lib/server/current-user";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const { messages } = await req.json();

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: "messages is required" }), { status: 400 });
  }

  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return new Response(JSON.stringify({ error: "Not signed in" }), { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: unknown) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };
      try {
        await runChatAgent(userId, messages, emit);
      } catch (err) {
        emit({ type: "error", message: err instanceof Error ? err.message : "Chat failed" });
        emit({ type: "done" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
