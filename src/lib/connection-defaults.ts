import type { ConnectionState } from "./types";

export const initialConnections: ConnectionState[] = [
  { id: "pagerduty", name: "PagerDuty", role: "Incident signal", connected: false, mode: "direct", dataMode: "live" },
  { id: "slack", name: "Slack", role: "Human context", connected: false, mode: "direct", dataMode: "live" },
  { id: "github", name: "GitHub", role: "Code & deploy context", connected: false, mode: "direct", dataMode: "synced" },
  { id: "jira", name: "Jira", role: "Org context & actions", connected: false, mode: "direct", dataMode: "synced" },
];
