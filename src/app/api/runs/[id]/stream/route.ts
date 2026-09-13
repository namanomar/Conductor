import { getRun } from "@/lib/server/runs-store";
import { getRunEmitter } from "@/lib/server/run-events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const emitter = getRunEmitter(id);
  const encoder = new TextEncoder();

  let onUpdate: () => void;
  let heartbeat: ReturnType<typeof setInterval>;

  const stream = new ReadableStream({
    async start(controller) {
      const send = async () => {
        const run = await getRun(id);
        if (!run) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(run)}\n\n`));
      };

      onUpdate = () => {
        send().catch(() => {});
      };
      emitter.on("update", onUpdate);
      heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`: heartbeat\n\n`));
      }, 15000);

      await send();
    },
    cancel() {
      emitter.off("update", onUpdate);
      clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
