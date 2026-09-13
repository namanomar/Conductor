import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "./session";
import { env } from "./env";

/** Throws if there is no valid session — callers should let this bubble into a 401. */
export async function requireUserId(): Promise<string> {
  const secret = env.sessionSecret();
  if (!secret) throw new Error("Login isn't configured yet");

  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const userId = await verifySessionToken(token, secret);
  if (!userId) throw new Error("Not signed in");
  return userId;
}
