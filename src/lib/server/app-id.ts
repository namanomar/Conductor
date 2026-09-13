import type { AppId } from "@/lib/types";

const validIds: AppId[] = ["pagerduty", "slack", "github", "jira"];

export function parseAppId(value: string): AppId {
  if (!validIds.includes(value as AppId)) {
    throw new Error(`Unknown app id: ${value}`);
  }
  return value as AppId;
}
