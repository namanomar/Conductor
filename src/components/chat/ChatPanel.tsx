"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, CheckCircle2, Loader2, Send, User, X, XCircle } from "lucide-react";
import { toolIcons, toolLabels } from "./tool-meta";

interface Step {
  id: string;
  name: string;
  status: "running" | "done" | "error";
  error?: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  steps?: Step[];
}

export function ChatPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const stepsRef = useRef<Step[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  };

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;

    const nextHistory = [...messages, { role: "user" as const, content: text }];
    setMessages([...nextHistory, { role: "assistant", content: "", steps: [] }]);
    setInput("");
    setBusy(true);
    stepsRef.current = [];
    scrollToBottom();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextHistory.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.body) throw new Error("No response stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const updateAssistant = (patch: Partial<Message>) => {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { ...next[next.length - 1], ...patch };
          return next;
        });
        scrollToBottom();
      };

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line);

          if (event.type === "tool_start") {
            stepsRef.current = [...stepsRef.current, { id: event.id, name: event.name, status: "running" }];
            updateAssistant({ steps: stepsRef.current });
          } else if (event.type === "tool_done") {
            stepsRef.current = stepsRef.current.map((s) =>
              s.id === event.id ? { ...s, status: event.ok ? "done" : "error", error: event.error } : s
            );
            updateAssistant({ steps: stepsRef.current });
          } else if (event.type === "message") {
            updateAssistant({ content: event.content, steps: stepsRef.current });
          } else if (event.type === "error") {
            updateAssistant({ content: `Error: ${event.message}`, steps: stepsRef.current });
          }
        }
      }
    } catch (err) {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          ...next[next.length - 1],
          content: err instanceof Error ? `Error: ${err.message}` : "Something went wrong.",
        };
        return next;
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 320, damping: 34 }}
          className="fixed right-0 top-0 z-40 flex h-full w-full max-w-sm flex-col border-l border-border bg-surface shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-border-soft px-4 py-3.5">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface-2">
                <Bot className="h-3.5 w-3.5 text-accent" />
              </span>
              <span className="text-sm font-medium">Conductor assistant</span>
            </div>
            <button onClick={onClose} className="text-muted transition hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <p className="text-xs leading-relaxed text-muted">
                Ask me to check on your connections, search Slack/GitHub/Jira, list PagerDuty
                incidents, or post updates — I&apos;ll use your connected apps directly and show
                each step as it runs.
              </p>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" && (
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-2">
                    <Bot className="h-3.5 w-3.5 text-accent" />
                  </span>
                )}
                <div className={`max-w-[85%] ${m.role === "user" ? "order-first" : ""}`}>
                  {m.role === "assistant" && m.steps && m.steps.length > 0 && (
                    <div className="mb-2 space-y-1">
                      {m.steps.map((step) => {
                        const Icon = toolIcons[step.name] ?? Bot;
                        return (
                          <div
                            key={step.id}
                            className="flex items-center gap-2 rounded-lg border border-border-soft bg-surface-2 px-2.5 py-1.5 text-[11px]"
                          >
                            <Icon className="h-3 w-3 text-muted" />
                            <span className="flex-1 text-muted">{toolLabels[step.name] ?? step.name}</span>
                            {step.status === "running" && <Loader2 className="h-3 w-3 animate-spin text-warning" />}
                            {step.status === "done" && <CheckCircle2 className="h-3 w-3 text-success" />}
                            {step.status === "error" && <XCircle className="h-3 w-3 text-danger" />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {m.content && (
                    <div
                      className={`rounded-xl px-3 py-2 text-sm leading-relaxed ${
                        m.role === "user" ? "bg-foreground text-background" : "border border-border-soft bg-surface-2"
                      }`}
                    >
                      {m.content}
                    </div>
                  )}
                  {m.role === "assistant" && !m.content && (!m.steps || m.steps.length === 0) && (
                    <div className="flex items-center gap-1.5 text-xs text-muted">
                      <Loader2 className="h-3 w-3 animate-spin" /> Thinking…
                    </div>
                  )}
                </div>
                {m.role === "user" && (
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-2">
                    <User className="h-3.5 w-3.5 text-muted" />
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="border-t border-border-soft p-3">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="e.g. Check for open PagerDuty incidents"
                disabled={busy}
                className="w-full rounded-lg border border-border-soft bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent-2 disabled:opacity-60"
              />
              <button
                onClick={send}
                disabled={busy || !input.trim()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-background transition disabled:opacity-40"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
