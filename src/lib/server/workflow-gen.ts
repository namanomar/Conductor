import { getOpenAI, OPENAI_MODEL } from "./openai";
import type { Edge } from "@xyflow/react";
import type { WorkflowNode, WorkflowNodeKind } from "@/components/workflows/nodes";

interface RawNode {
  id: string;
  kind: WorkflowNodeKind;
  label: string;
  sub?: string;
  icon?: string;
  capability?: string;
}

interface RawGraph {
  nodes: RawNode[];
  edges: { source: string; target: string }[];
}

const SYSTEM_PROMPT = `You design agent automation workflows for Conductor, a platform that connects PagerDuty, Slack, GitHub, and Jira.

A workflow is a directed graph of nodes with exactly these "kind" values:
- "trigger": what starts the workflow. Required — every workflow needs exactly one, with no incoming edges. If the user didn't describe a real external event, use a plain manual/on-demand trigger — don't invent a PagerDuty alert that isn't relevant to what they asked for.
- "investigate": gather/read context from an app (Slack, GitHub, or Jira) — a pure lookup, no side effects.
- "reason": an LLM step that synthesizes gathered evidence into a conclusion, summary, or decision.
- "approval": a human-in-the-loop gate. Only include this if the workflow has an "action" step that writes/posts/creates something — never add it otherwise.
- "action": a write operation against an app (post to Slack, create a Jira issue, open a GitHub issue, etc.). Only include this if the user actually asked for something to be written, posted, or created somewhere.
- "verify": re-checks that an action actually took effect. Only include this if there's an "action" node to verify — never add it as a generic finishing touch.

Critical rule — build the SMALLEST graph that does exactly what the user asked, nothing more:
- If they just want to look something up or check on something, that's trigger → investigate (→ reason, if they want it summarized/analyzed). Stop there. Do NOT add approval/action/verify when nothing is being written anywhere.
- Only add approval + action + verify when the request genuinely involves creating, posting, or writing something to an app.
- Most workflows should be 2-5 nodes. Only go larger (up to 10) when the user's request genuinely spans multiple apps or multiple real steps — never pad a simple request into a bigger graph to match some fixed shape.
- Don't force every workflow through the same trigger→investigate→reason→approval→action→verify pipeline — that's one possible shape, not a template to fill in every time.

Every "investigate"/"action" node executes ONE fixed real capability based on its icon (and "capability" for Slack) — do not invent behavior beyond this list, and write the label to match what it actually does:
- investigate + icon "slack": searches recent messages in the connected channel for the incident's keywords. Set "capability": "search_messages" (or omit it — this is the default).
- investigate + icon "slack" with "capability": "list_channels": lists the channels in the connected Slack workspace (no keyword search).
- investigate + icon "github": searches recent pull requests in the connected repo.
- investigate + icon "jira": searches recent issues in the connected project.
- action + icon "slack": posts one message to the connected channel.
- action + icon "github": creates one issue in the connected repo.
- action + icon "jira": creates one issue in the connected project.
There is no way to list GitHub repos, list Jira projects, read Slack threads, react to messages, or anything else not listed above — don't generate a node implying a capability that isn't in this list.

Other rules:
- Use "icon" from this set only: alert, slack, github, jira, brain, approve, verify, zap. Pick the icon that matches the app/purpose (e.g. a Slack-only workflow's trigger can use icon "slack" or "zap", not "alert", if it's not PagerDuty-driven).
- Keep labels short (2-5 words) and specific to what that node actually does. "sub" is an optional short subtitle.
- Return strict JSON only, matching this TypeScript type:
  { "nodes": { "id": string, "kind": string, "label": string, "sub"?: string, "icon"?: string, "capability"?: string }[],
    "edges": { "source": string, "target": string }[] }
- "id" values must be unique, short, kebab-case.`;

const columnX: Record<WorkflowNodeKind, number> = {
  trigger: 0,
  investigate: 320,
  reason: 640,
  approval: 960,
  action: 1280,
  tool: 1280,
  verify: 1600,
};

function layout(raw: RawGraph): { nodes: WorkflowNode[]; edges: Edge[] } {
  const columnCounts: Partial<Record<WorkflowNodeKind, number>> = {};
  const nodes: WorkflowNode[] = raw.nodes.map((n) => {
    const row = columnCounts[n.kind] ?? 0;
    columnCounts[n.kind] = row + 1;
    return {
      id: n.id,
      type: "workflowNode",
      position: { x: columnX[n.kind] ?? 0, y: row * 160 },
      data: { label: n.label, sub: n.sub, kind: n.kind, icon: n.icon, capability: n.capability },
    };
  });

  const edges: Edge[] = raw.edges.map((e, i) => ({
    id: `e-${e.source}-${e.target}-${i}`,
    source: e.source,
    target: e.target,
  }));

  return { nodes, edges };
}

export async function generateWorkflowFromPrompt(prompt: string) {
  const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned an empty response");

  let raw: RawGraph;
  try {
    raw = JSON.parse(content);
  } catch {
    throw new Error("OpenAI response was not valid JSON");
  }

  if (!Array.isArray(raw.nodes) || !Array.isArray(raw.edges)) {
    throw new Error("OpenAI response did not match the expected workflow schema");
  }

  return layout(raw);
}
