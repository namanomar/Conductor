import {
  AlertTriangle,
  GitPullRequest,
  MessageSquare,
  Ticket,
  type LucideIcon,
} from "lucide-react";
import type { AppId } from "./types";

interface AppMeta {
  label: string;
  icon: LucideIcon;
  color: string;
  bg: string;
}

export const appMeta: Record<AppId, AppMeta> = {
  pagerduty: {
    label: "PagerDuty",
    icon: AlertTriangle,
    color: "#6fae7d",
    bg: "rgba(111,174,125,0.12)",
  },
  slack: {
    label: "Slack",
    icon: MessageSquare,
    color: "#c1876e",
    bg: "rgba(193,135,110,0.12)",
  },
  github: {
    label: "GitHub",
    icon: GitPullRequest,
    color: "#98a2ae",
    bg: "rgba(152,162,174,0.12)",
  },
  jira: {
    label: "Jira",
    icon: Ticket,
    color: "#6f9c96",
    bg: "rgba(111,156,150,0.12)",
  },
};
