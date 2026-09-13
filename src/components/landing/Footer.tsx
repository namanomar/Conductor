export function Footer() {
  return (
    <footer className="border-t border-border-soft py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-xs text-muted sm:flex-row">
        <span>© {new Date().getFullYear()} Conductor. Hackathon build.</span>
        <span>Incident Commander · PagerDuty · Slack · GitHub · Jira</span>
      </div>
    </footer>
  );
}
