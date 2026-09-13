"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Cable, LayoutGrid, LogOut, Workflow } from "lucide-react";
import clsx from "clsx";

const items = [
  { href: "/app/runs", label: "Runs", icon: LayoutGrid },
  { href: "/app/workflows", label: "Workflows", icon: Workflow },
  { href: "/app/connections", label: "Connections", icon: Cable },
];

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.username) setUsername(data.username);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border-soft bg-surface/60 px-5">
      <Link href="/" className="mr-2 flex items-center gap-2 font-medium tracking-tight">
        <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface-2">
          <Workflow className="h-3.5 w-3.5 text-accent" strokeWidth={2} />
        </span>
        Conductor
      </Link>

      <nav className="flex h-full items-center gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "relative flex h-full items-center gap-2 px-3 text-sm font-medium transition",
                active ? "text-foreground" : "text-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
              {active && (
                <motion.span
                  layoutId="topbar-active"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-accent"
                />
              )}
            </Link>
          );
        })}
      </nav>

      <Link
        href="/app/docs"
        className={clsx(
          "ml-auto flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition",
          pathname.startsWith("/app/docs")
            ? "bg-surface-2 text-foreground"
            : "text-muted hover:bg-surface-2/60 hover:text-foreground"
        )}
      >
        <BookOpen className="h-4 w-4" />
        Docs
      </Link>

      {username && (
        <div className="flex items-center gap-2 border-l border-border-soft pl-3">
          <span className="text-sm text-muted">{username}</span>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted transition hover:bg-surface-2/60 hover:text-foreground"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      )}
    </header>
  );
}
