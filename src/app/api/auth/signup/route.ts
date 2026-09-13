import { NextResponse } from "next/server";
import { createUser } from "@/lib/server/users-store";
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/server/session";
import { env } from "@/lib/server/env";

export async function POST(req: Request) {
  const secret = env.sessionSecret();
  if (!secret) {
    return NextResponse.json({ error: "Login isn't configured yet." }, { status: 503 });
  }

  const { username, password } = await req.json();
  if (typeof username !== "string" || typeof password !== "string" || !username.trim() || !password) {
    return NextResponse.json({ error: "Username and password are both required." }, { status: 400 });
  }
  if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(username)) {
    return NextResponse.json(
      { error: "Username must be 3-32 characters: letters, numbers, . _ -" },
      { status: 400 }
    );
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  try {
    const user = await createUser(username, password);
    const token = await createSessionToken(user.id, secret);
    const res = NextResponse.json({ ok: true, username: user.username });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return res;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create account" },
      { status: 400 }
    );
  }
}
