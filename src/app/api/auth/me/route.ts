import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/server/current-user";
import { getUserById } from "@/lib/server/users-store";

export async function GET() {
  try {
    const userId = await requireUserId();
    const user = await getUserById(userId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json({ username: user.username });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Not signed in" }, { status: 401 });
  }
}
