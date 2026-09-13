import type { Edge } from "@xyflow/react";
import type { WorkflowNode, WorkflowNodeKind } from "@/components/workflows/nodes";
import { getRun, patchNodeState, patchRun, type NodeRunStatus, type RunDoc } from "./runs-store";
import { emitRunUpdate, waitForApproval } from "./run-events";
import { resolveConnection } from "./auth-resolve";
import { githubCreateIssue, githubSearchRecentPRs, githubVerifyIssue } from "./connectors/github";
import { slackListChannels, slackPostMessage, slackSearchChannel, slackVerifyMessage } from "./connectors/slack";
import { jiraCreateIssue, jiraSearchProjectIssues, jiraVerifyIssue } from "./connectors/jira";
import { pagerdutyOpenIncidents } from "./connectors/pagerduty";
import { getOpenAI, OPENAI_MODEL } from "./openai";
import { callMcpSourceTool } from "./dynamic-mcp-tools";

type AppIcon = "slack" | "github" | "jira";

function appFromIcon(icon?: string): AppIcon | null {
  if (icon === "slack" || icon === "github" || icon === "jira") return icon;
  return null;
}

/** Pull a search keyword out of whatever the trigger node found, so investigate
 * steps search for THIS incident instead of just listing whatever's recent. */
function getIncidentKeyword(run: RunDoc): string {
  for (const node of run.nodes) {
    if (node.data.kind !== "trigger") continue;
    const output = run.nodeStates[node.id]?.output as { title?: string } | null | undefined;
    if (output?.title) return output.title;
  }
  return "";
}

async function setNode(runId: string, nodeId: string, status: NodeRunStatus, log?: string, output?: unknown) {
  const patch: Record<string, unknown> = { status };
  if (status === "running") patch.startedAt = new Date().toISOString();
  if (status === "success" || status === "error" || status === "skipped") patch.endedAt = new Date().toISOString();
  if (output !== undefined) patch.output = output;
  await patchNodeState(runId, nodeId, patch, log);
  emitRunUpdate(runId);
}

async function runInvestigate(userId: string, runId: string, node: WorkflowNode, keyword: string) {
  const app = appFromIcon(node.data.icon);
  if (!app) return setNode(runId, node.id, "error", "No app configured for this investigate step");
  try {
    const { doc, token, jiraAuth } = await resolveConnection(userId, app);
    if (app === "slack") {
      if (node.data.capability === "list_channels") {
        const channels = await slackListChannels(token);
        return setNode(runId, node.id, "success", `Found ${channels.length} channel(s)`, channels);
      }
      if (!doc.config) throw new Error("Set a Channel ID in Connections first");
      const messages = await slackSearchChannel(token, doc.config, keyword);
      return setNode(runId, node.id, "success", `Found ${messages.length} relevant message(s) in ${doc.config}`, messages);
    }
    if (app === "github") {
      if (!doc.config) throw new Error("Set a Repository in Connections first");
      const prs = await githubSearchRecentPRs(token, doc.config, keyword);
      return setNode(runId, node.id, "success", `Found ${prs.length} relevant PR(s) in ${doc.config}`, prs);
    }
    if (app === "jira") {
      if (!doc.config || !jiraAuth) throw new Error("Set a Project key in Connections first");
      const issues = await jiraSearchProjectIssues(jiraAuth, doc.config, keyword);
      return setNode(runId, node.id, "success", `Found ${issues.length} relevant issue(s) in ${doc.config}`, issues);
    }
  } catch (err) {
    return setNode(runId, node.id, "error", err instanceof Error ? err.message : "Investigation failed");
  }
}

async function runTrigger(userId: string, runId: string, node: WorkflowNode) {
  // Only a PagerDuty-style trigger (icon "alert") actually checks PagerDuty —
  // any other trigger (e.g. a Slack-themed one from a generated workflow) has
  // no real event source wired up yet, so it just starts the run honestly
  // instead of silently reporting PagerDuty data that has nothing to do with it.
  if (node.data.icon !== "alert") {
    return setNode(runId, node.id, "success", "Manual trigger — starting the workflow now", null);
  }
  try {
    const { doc, token } = await resolveConnection(userId, "pagerduty");
    const incidents = await pagerdutyOpenIncidents(token, doc.config || undefined);
    if (!incidents.length) {
      return setNode(runId, node.id, "success", "PagerDuty connected — no open incidents right now", null);
    }
    return setNode(runId, node.id, "success", `Triggered by open incident: ${incidents[0].title}`, incidents[0]);
  } catch (err) {
    return setNode(
      runId,
      node.id,
      "success",
      `Couldn't read PagerDuty incidents (${err instanceof Error ? err.message : "unknown error"}) — proceeding manually`,
      null
    );
  }
}

async function runReason(runId: string, node: WorkflowNode, predecessorOutputs: unknown[], incidentTitle: string) {
  try {
    const evidence = predecessorOutputs.filter(Boolean);
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: `You are an incident investigator. You're given evidence gathered from Slack, GitHub, and Jira as JSON for the incident "${incidentTitle || "this incident"}".

Write:
- summary: a 2-3 sentence root cause hypothesis, grounded only in the evidence given (say so plainly if the evidence is thin or inconclusive — don't invent a confident story from nothing)
- confidence: 0-100
- slackMessage: a short, plain-language incident-channel update (2-3 sentences) a human would actually post — state what's known and what's still being checked
- githubTitle: a specific, short issue title for tracking the investigation (not generic like "Investigate incident")
- githubBody: 2-4 sentences for the issue body — what to check/fix, referencing specific evidence (PR numbers, message content) when available
- jiraSummary: a short, specific ticket summary line
- jiraDescription: 2-4 sentences for the ticket description

Respond as JSON with exactly those six keys.`,
        },
        { role: "user", content: JSON.stringify(evidence).slice(0, 12000) },
      ],
      response_format: { type: "json_object" },
    });
    const content = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);
    return setNode(
      runId,
      node.id,
      "success",
      `Hypothesis formed (${parsed.confidence ?? "?"}% confidence)`,
      parsed
    );
  } catch (err) {
    return setNode(runId, node.id, "error", err instanceof Error ? err.message : "Reasoning step failed");
  }
}

async function runApproval(runId: string, node: WorkflowNode) {
  await setNode(runId, node.id, "running", "Waiting for human approval…");
  await patchRun(runId, { status: "awaiting_approval" });
  emitRunUpdate(runId);
  await waitForApproval(runId);
  await patchRun(runId, { status: "running" });
  await setNode(runId, node.id, "success", "Approved by operator");
}

async function runAction(
  userId: string,
  runId: string,
  node: WorkflowNode,
  reasonOutput: Record<string, unknown> | undefined
) {
  const app = appFromIcon(node.data.icon);
  if (!app) return setNode(runId, node.id, "error", "No app configured for this action");
  const fallback = `Automated action from Conductor: ${node.data.label}`;

  try {
    const { doc, token, jiraAuth } = await resolveConnection(userId, app);
    if (app === "slack") {
      if (!doc.config) throw new Error("Set a Channel ID in Connections first");
      const text = (reasonOutput?.slackMessage as string) || fallback;
      const res = await slackPostMessage(token, doc.config, `🤖 ${text}`);
      return setNode(runId, node.id, "success", `Posted to ${doc.config}`, res);
    }
    if (app === "github") {
      if (!doc.config) throw new Error("Set a Repository in Connections first");
      const title = (reasonOutput?.githubTitle as string) || node.data.label;
      const body = (reasonOutput?.githubBody as string) || fallback;
      const res = await githubCreateIssue(token, doc.config, title, body);
      return setNode(runId, node.id, "success", `Created issue #${res.number}`, res);
    }
    if (app === "jira") {
      if (!doc.config || !jiraAuth) throw new Error("Set a Project key in Connections first");
      const summary = (reasonOutput?.jiraSummary as string) || node.data.label;
      const description = (reasonOutput?.jiraDescription as string) || fallback;
      const res = await jiraCreateIssue(jiraAuth, doc.config, summary, description);
      const siteUrl = doc.credential?.meta?.siteUrl;
      const output = siteUrl ? { ...res, url: `${siteUrl.replace(/\/$/, "")}/browse/${res.key}` } : res;
      return setNode(runId, node.id, "success", `Created ${res.key}`, output);
    }
  } catch (err) {
    return setNode(runId, node.id, "error", err instanceof Error ? err.message : "Action failed");
  }
}

async function runToolNode(userId: string, runId: string, node: WorkflowNode) {
  const { sourceId, toolName } = node.data;
  if (!sourceId || !toolName) {
    return setNode(runId, node.id, "error", "This tool node is missing its source/tool identity");
  }
  try {
    // No per-node argument configuration exists yet — tools that require
    // arguments will surface that as a clear error here rather than guessing.
    const result = await callMcpSourceTool(userId, sourceId, toolName, {});
    return setNode(runId, node.id, "success", `Called ${toolName}`, result);
  } catch (err) {
    return setNode(runId, node.id, "error", err instanceof Error ? err.message : "Tool call failed");
  }
}

async function runVerify(
  userId: string,
  runId: string,
  node: WorkflowNode,
  actionOutputs: { app: AppIcon; output: unknown }[]
) {
  const results: string[] = [];
  let allOk = actionOutputs.length > 0;

  for (const { app, output } of actionOutputs) {
    try {
      const { doc, token, jiraAuth } = await resolveConnection(userId, app);
      let ok = false;
      if (app === "slack" && doc.config) {
        ok = await slackVerifyMessage(token, doc.config, (output as { ts: string }).ts);
      } else if (app === "github" && doc.config) {
        ok = await githubVerifyIssue(token, doc.config, (output as { number: number }).number);
      } else if (app === "jira" && jiraAuth) {
        ok = await jiraVerifyIssue(jiraAuth, (output as { key: string }).key);
      }
      results.push(`${app}: ${ok ? "verified" : "not found"}`);
      allOk = allOk && ok;
    } catch (err) {
      allOk = false;
      results.push(`${app}: ${err instanceof Error ? err.message : "verification error"}`);
    }
  }

  return setNode(runId, node.id, allOk ? "success" : "error", results.join(" · ") || "Nothing to verify");
}

export async function executeWorkflow(runId: string) {
  const run = await getRun(runId);
  if (!run) return;

  const { userId, nodes, edges } = run;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const predecessorsOf = (id: string) => edges.filter((e: Edge) => e.target === id).map((e) => e.source);
  const successorsOf = (id: string) => edges.filter((e: Edge) => e.source === id).map((e) => e.target);

  const indegree = new Map<string, number>();
  for (const n of nodes) indegree.set(n.id, predecessorsOf(n.id).length);

  // Search upstream past intermediate nodes (e.g. an "approval" gate sitting
  // directly between "reason" and "action") instead of only checking the
  // immediate predecessor — the reason output is usually not one hop away.
  const findUpstreamOutput = (nodeId: string, targetKind: WorkflowNodeKind, runDoc: RunDoc | null) => {
    const visited = new Set<string>();
    const queue = [...predecessorsOf(nodeId)];
    while (queue.length) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      const n = byId.get(id);
      if (!n) continue;
      if (n.data.kind === targetKind) return runDoc?.nodeStates[id]?.output;
      queue.push(...predecessorsOf(id));
    }
    return undefined;
  };

  const finished = new Map<string, "success" | "error" | "skipped">();
  let queue = nodes.filter((n) => indegree.get(n.id) === 0).map((n) => n.id);

  while (queue.length) {
    await Promise.all(
      queue.map(async (nodeId) => {
        const node = byId.get(nodeId);
        if (!node) return;

        const preds = predecessorsOf(nodeId);
        if (preds.some((p) => finished.get(p) === "error" || finished.get(p) === "skipped")) {
          await setNode(runId, nodeId, "skipped", "Skipped — an upstream step failed");
          finished.set(nodeId, "skipped");
          return;
        }

        await setNode(runId, nodeId, "running");
        const kind = node.data.kind as WorkflowNodeKind;

        if (kind === "trigger") await runTrigger(userId, runId, node);
        else if (kind === "investigate") {
          const runDoc = await getRun(runId);
          const keyword = runDoc ? getIncidentKeyword(runDoc) : "";
          await runInvestigate(userId, runId, node, keyword);
        } else if (kind === "reason") {
          const runDoc = await getRun(runId);
          const predOutputs = preds.map((p) => runDoc?.nodeStates[p]?.output).filter(Boolean);
          const incidentTitle = runDoc ? getIncidentKeyword(runDoc) : "";
          await runReason(runId, node, predOutputs, incidentTitle);
        } else if (kind === "approval") await runApproval(runId, node);
        else if (kind === "action") {
          const runDoc = await getRun(runId);
          const reasonOutput = findUpstreamOutput(nodeId, "reason", runDoc) as
            | Record<string, unknown>
            | undefined;
          await runAction(userId, runId, node, reasonOutput);
        } else if (kind === "tool") await runToolNode(userId, runId, node);
        else if (kind === "verify") {
          const runDoc = await getRun(runId);
          const visited = new Set<string>();
          const actionNodes: WorkflowNode[] = [];
          const stack = [...preds];
          while (stack.length) {
            const id = stack.pop()!;
            if (visited.has(id)) continue;
            visited.add(id);
            const n = byId.get(id);
            if (!n) continue;
            if (n.data.kind === "action") actionNodes.push(n);
            else stack.push(...predecessorsOf(id));
          }
          const actionOutputs = actionNodes
            .map((n) => ({
              app: appFromIcon(n.data.icon) as AppIcon,
              output: runDoc?.nodeStates[n.id]?.output,
            }))
            .filter((x) => x.app && x.output);
          await runVerify(userId, runId, node, actionOutputs);
        }

        const after = await getRun(runId);
        const finalStatus = after?.nodeStates[nodeId]?.status;
        finished.set(nodeId, finalStatus === "error" ? "error" : finalStatus === "skipped" ? "skipped" : "success");
      })
    );

    const nextSet = new Set<string>();
    for (const nodeId of queue) {
      for (const succ of successorsOf(nodeId)) {
        const remaining = (indegree.get(succ) ?? 0) - 1;
        indegree.set(succ, remaining);
        if (remaining <= 0) nextSet.add(succ);
      }
    }
    queue = Array.from(nextSet).filter((id) => !finished.has(id));
  }

  const anyError = Array.from(finished.values()).some((s) => s === "error");
  await patchRun(runId, { status: anyError ? "failed" : "completed" });
  emitRunUpdate(runId);
}
