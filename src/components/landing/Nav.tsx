import Link from "next/link";
import { Workflow } from "lucide-react";

export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border-soft bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 font-medium tracking-tight">
          <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface-2">
            <Workflow className="h-3.5 w-3.5 text-accent" strokeWidth={2} />
          </span>
          Conductor
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-muted md:flex">
          <a href="#platform" className="link-underline transition hover:text-foreground">
            Platform
          </a>
          <a href="#loop" className="link-underline transition hover:text-foreground">
            How it works
          </a>
          <a href="#get-started" className="link-underline transition hover:text-foreground">
            Get started
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/app/runs"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 active:scale-[0.98]"
          >
            Launch Console
          </Link>
        </div>
      </div>
    </header>
  );
}
