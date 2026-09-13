import { Cable, GitPullRequest, MessageSquare, Ticket, AlertTriangle, type LucideIcon } from "lucide-react";

export const toolLabels: Record<string, string> = {
  list_connections: "Checking connections",
  pagerduty_list_incidents: "Listing PagerDuty incidents",
  slack_search: "Searching Slack",
  slack_post_message: "Posting to Slack",
  github_search_prs: "Searching GitHub pull requests",
  github_create_issue: "Creating GitHub issue",
  jira_search_issues: "Searching Jira issues",
  jira_create_issue: "Creating Jira issue",
};

export const toolIcons: Record<string, LucideIcon> = {
  list_connections: Cable,
  pagerduty_list_incidents: AlertTriangle,
  slack_search: MessageSquare,
  slack_post_message: MessageSquare,
  github_search_prs: GitPullRequest,
  github_create_issue: GitPullRequest,
  jira_search_issues: Ticket,
  jira_create_issue: Ticket,
};
