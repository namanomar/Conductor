export type AppId = "pagerduty" | "slack" | "github" | "jira";

export type ConnectionMode = "mcp" | "direct";
export type DataMode = "live" | "synced";

export interface ConnectionState {
  id: AppId;
  name: string;
  role: string;
  connected: boolean;
  mode: ConnectionMode;
  dataMode: DataMode;
  lastSynced?: string;
}

export interface ConnectionApiState {
  id: AppId;
  connected: boolean;
  mode: ConnectionMode;
  dataMode: DataMode;
  config?: string;
  credentialType?: "oauth" | "api_key" | "mcp_token";
  lastSyncedAt?: string;
}

export type StepStatus = "pending" | "active" | "done";

export interface TimelineEvent {
  id: string;
  app: AppId | "agent";
  time: string;
  title: string;
  detail: string;
}

export type EvidenceNodeId = "pagerduty" | "slack" | "github" | "jira";

export interface EvidenceNode {
  id: EvidenceNodeId;
  label: string;
  detail: string;
}

export type ActionStatus = "pending" | "approved" | "executing" | "success" | "verified";

export interface IncidentAction {
  id: string;
  app: AppId;
  title: string;
  description: string;
  status: ActionStatus;
}

export type RunState =
  | "idle"
  | "investigating"
  | "hypothesis"
  | "plan"
  | "awaiting_approval"
  | "executing"
  | "verifying"
  | "resolved";
