import type { Edge } from "@xyflow/react";
import type { WorkflowNode } from "@/components/workflows/nodes";

export interface PaletteItem {
  id: string;
  label: string;
  sub: string;
  kind: WorkflowNode["data"]["kind"];
  icon: string;
  sourceId?: string;
  toolName?: string;
  capability?: string;
}

export const paletteItems: PaletteItem[] = [
  { id: "trigger-pagerduty", label: "PagerDuty Alert", sub: "Trigger", kind: "trigger", icon: "alert" },
  { id: "investigate-slack", label: "Search Slack", sub: "Investigate", kind: "investigate", icon: "slack" },
  { id: "investigate-slack-channels", label: "List Slack Channels", sub: "Investigate", kind: "investigate", icon: "slack", capability: "list_channels" },
  { id: "investigate-github", label: "Search GitHub", sub: "Investigate", kind: "investigate", icon: "github" },
  { id: "investigate-jira", label: "Search Jira", sub: "Investigate", kind: "investigate", icon: "jira" },
  { id: "reason-hypothesis", label: "Build Hypothesis", sub: "Reason", kind: "reason", icon: "brain" },
  { id: "approval-gate", label: "Human Approval Gate", sub: "Approval", kind: "approval", icon: "approve" },
  { id: "action-slack", label: "Post Slack Update", sub: "Action", kind: "action", icon: "slack" },
  { id: "action-jira", label: "Create Jira Incident", sub: "Action", kind: "action", icon: "jira" },
  { id: "action-github", label: "Create GitHub Issue", sub: "Action", kind: "action", icon: "github" },
  { id: "verify-all", label: "Verify Actions", sub: "Verify", kind: "verify", icon: "verify" },
];

export const incidentCommanderTemplate: { nodes: WorkflowNode[]; edges: Edge[] } = {
  nodes: [
    { id: "trigger", type: "workflowNode", position: { x: 0, y: 180 }, data: { label: "PagerDuty Alert", sub: "SEV-1 latency", kind: "trigger", icon: "alert" } },

    { id: "inv-slack", type: "workflowNode", position: { x: 300, y: 0 }, data: { label: "Search Slack", sub: "deployment mentions", kind: "investigate", icon: "slack" } },
    { id: "inv-github", type: "workflowNode", position: { x: 300, y: 180 }, data: { label: "Search GitHub", sub: "recent PRs & deploys", kind: "investigate", icon: "github" } },
    { id: "inv-jira", type: "workflowNode", position: { x: 300, y: 360 }, data: { label: "Search Jira", sub: "related tickets", kind: "investigate", icon: "jira" } },

    { id: "reason", type: "workflowNode", position: { x: 620, y: 180 }, data: { label: "Build Hypothesis", sub: "evidence graph + confidence", kind: "reason", icon: "brain" } },

    { id: "approval", type: "workflowNode", position: { x: 940, y: 180 }, data: { label: "Human Approval Gate", sub: "approve proposed actions", kind: "approval", icon: "approve" } },

    { id: "act-slack", type: "workflowNode", position: { x: 1260, y: 0 }, data: { label: "Post Slack Update", sub: "#incidents", kind: "action", icon: "slack" } },
    { id: "act-jira", type: "workflowNode", position: { x: 1260, y: 180 }, data: { label: "Create Jira Incident", sub: "INC-1842 · P0", kind: "action", icon: "jira" } },
    { id: "act-github", type: "workflowNode", position: { x: 1260, y: 360 }, data: { label: "Create GitHub Issue", sub: "investigation issue", kind: "action", icon: "github" } },

    { id: "verify", type: "workflowNode", position: { x: 1580, y: 180 }, data: { label: "Verify Actions", sub: "re-fetch & confirm", kind: "verify", icon: "verify" } },
  ],
  edges: [
    { id: "e-trigger-slack", source: "trigger", target: "inv-slack" },
    { id: "e-trigger-github", source: "trigger", target: "inv-github" },
    { id: "e-trigger-jira", source: "trigger", target: "inv-jira" },

    { id: "e-slack-reason", source: "inv-slack", target: "reason" },
    { id: "e-github-reason", source: "inv-github", target: "reason" },
    { id: "e-jira-reason", source: "inv-jira", target: "reason" },

    { id: "e-reason-approval", source: "reason", target: "approval" },

    { id: "e-approval-slack", source: "approval", target: "act-slack" },
    { id: "e-approval-jira", source: "approval", target: "act-jira" },
    { id: "e-approval-github", source: "approval", target: "act-github" },

    { id: "e-slack-verify", source: "act-slack", target: "verify" },
    { id: "e-jira-verify", source: "act-jira", target: "verify" },
    { id: "e-github-verify", source: "act-github", target: "verify" },
  ],
};
