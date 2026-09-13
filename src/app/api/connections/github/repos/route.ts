import { NextResponse } from "next/server";
import { resolveConnection } from "@/lib/server/auth-resolve";
import { requireUserId } from "@/lib/server/current-user";

export async function GET() {
  try {
    const userId = await requireUserId();
    const { token } = await resolveConnection(userId, "github");
    const res = await fetch("https://api.github.com/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    if (!res.ok) throw new Error(`GitHub list repos failed (${res.status})`);
    const repos = (await res.json()) as { full_name: string; private: boolean; updated_at: string }[];
    return NextResponse.json({
      repos: repos.map((r) => ({ fullName: r.full_name, private: r.private, updatedAt: r.updated_at })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list repositories" },
      { status: 400 }
    );
  }
}
