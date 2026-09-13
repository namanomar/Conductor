import Link from "next/link";
import { ArrowRight, PlayCircle } from "lucide-react";

export function CTASection() {
  return (
    <section id="get-started" className="relative border-t border-border-soft py-24">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <div className="rounded-2xl border border-border bg-surface bg-radial-fade p-12">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-2 px-4 py-1.5 text-xs font-medium text-muted">
            <PlayCircle className="h-3.5 w-3.5 text-accent-2" />
            Real connectors, real MongoDB, real OpenAI reasoning
          </span>
          <h2 className="mt-5 text-3xl font-medium tracking-tight sm:text-4xl">
            Connect your apps and run it for real
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted">
            Connect PagerDuty, Slack, GitHub, and Jira, then run the Incident
            Commander workflow: Conductor pulls live evidence from each app,
            forms a hypothesis with OpenAI, proposes actions, and independently
            verifies every one of them.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/app/connections"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 rounded-lg bg-foreground px-6 py-3 text-sm font-medium text-background transition hover:opacity-90 active:scale-[0.98]"
            >
              Connect your apps
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/app/runs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-6 py-3 text-sm font-medium transition hover:border-muted active:scale-[0.98]"
            >
              Go to console
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
