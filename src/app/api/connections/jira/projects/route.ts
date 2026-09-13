import { NextResponse } from "next/server";
import { resolveConnection } from "@/lib/server/auth-resolve";

export async function GET() {
  try {
    const { jiraAuth } = await resolveConnection("jira");
    if (!jiraAuth) throw new Error("Jira auth not resolved");
    const res = await fetch(`${jiraAuth.baseUrl}/project/search`, {
      headers: { Authorization: jiraAuth.authHeader, Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Jira list projects failed (${res.status})`);
    const data = await res.json();
    const projects = (data.values ?? []) as { key: string; name: string }[];
    return NextResponse.json({ projects: projects.map((p) => ({ key: p.key, name: p.name })) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list projects" },
      { status: 400 }
    );
  }
}
