import { NextResponse } from "next/server";
import { resolveConnection } from "@/lib/server/auth-resolve";
import { requireUserId } from "@/lib/server/current-user";
import { slackListChannels } from "@/lib/server/connectors/slack";

export async function GET() {
  try {
    const userId = await requireUserId();
    const { token } = await resolveConnection(userId, "slack");
    const channels = await slackListChannels(token);
    return NextResponse.json({ channels });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list channels" },
      { status: 400 }
    );
  }
}
