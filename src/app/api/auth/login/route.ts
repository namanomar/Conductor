import { NextResponse } from "next/server";
import { verifyLogin } from "@/lib/server/users-store";
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/server/session";
import { env } from "@/lib/server/env";

export async function POST(req: Request) {
  const secret = env.sessionSecret();
  if (!secret) {
    return NextResponse.json({ error: "Login isn't configured yet." }, { status: 503 });
  }

  const { username, password } = await req.json();
  if (typeof username !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "Username and password are both required." }, { status: 400 });
  }

  const user = await verifyLogin(username, password);
  if (!user) {
    return NextResponse.json({ error: "Incorrect username or password." }, { status: 401 });
  }

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
}
