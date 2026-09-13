const API = "https://slack.com/api";

async function call(token: string, method: string, body?: Record<string, unknown>) {
  const res = await fetch(`${API}/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Slack API ${method} failed: ${data.error}`);
  return data;
}

export async function slackValidate(token: string) {
  const data = await call(token, "auth.test");
  return { team: data.team as string, user: data.user as string };
}

export async function slackListChannels(token: string) {
  const data = await call(token, "conversations.list", {
    types: "public_channel,private_channel",
    exclude_archived: true,
    limit: 200,
  });
  const channels = (data.channels ?? []) as { id: string; name: string; is_member?: boolean; is_private?: boolean }[];
  return channels
    .map((c) => ({ id: c.id, name: c.name, isMember: Boolean(c.is_member), isPrivate: Boolean(c.is_private) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function resolveUserNames(token: string, userIds: string[]): Promise<Map<string, string>> {
  const unique = Array.from(new Set(userIds));
  const entries = await Promise.all(
    unique.map(async (id) => {
      try {
        const data = await call(token, "users.info", { user: id });
        const name = (data.user?.profile?.display_name || data.user?.real_name || data.user?.name) as
          | string
          | undefined;
        return [id, name || id] as const;
      } catch {
        return [id, id] as const;
      }
    })
  );
  return new Map(entries);
}

function formatSlackTimestamp(ts: string): string {
  const ms = Number(ts) * 1000;
  if (Number.isNaN(ms)) return ts;
  return new Date(ms).toLocaleString();
}

const STOP_WORDS = new Set(["the", "and", "for", "was", "has", "with", "from", "this", "that"]);

function significantTerms(phrase: string): string[] {
  return phrase
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .filter((w) => w.length >= 4 && !STOP_WORDS.has(w) && Number.isNaN(Number(w)));
}

export async function slackSearchChannel(token: string, channel: string, keyword: string) {
  const data = await call(token, "conversations.history", { channel, limit: 50 });
  const raw = (data.messages ?? []) as { text?: string; ts?: string; user?: string; subtype?: string }[];

  // Drop join/leave/system messages — only real, human-authored messages matter here.
  const humanMessages = raw.filter((m) => !m.subtype && m.text && m.user);
  const terms = keyword ? significantTerms(keyword) : [];
  const keywordMatches = terms.length
    ? humanMessages.filter((m) => terms.some((t) => m.text!.toLowerCase().includes(t)))
    : [];

  // Fall back to the most recent messages if the incident's own keywords don't
  // show up verbatim — still real evidence, just not keyword-filtered.
  const matches = keywordMatches.length ? keywordMatches : humanMessages;
  const top = matches.slice(0, 5);

  const mentionPattern = /<@([A-Z0-9]+)>/g;
  const mentionedIds = top.flatMap((m) => Array.from(m.text!.matchAll(mentionPattern), (mm) => mm[1]));
  const names = await resolveUserNames(token, [...top.map((m) => m.user!), ...mentionedIds]);

  return top.map((m) => {
    const author = names.get(m.user!) ?? m.user!;
    const text = m.text!.replace(mentionPattern, (_match, id) => `@${names.get(id) ?? id}`);
    return { author, text, postedAt: formatSlackTimestamp(m.ts!) };
  });
}

export async function slackPostMessage(token: string, channel: string, text: string) {
  const data = await call(token, "chat.postMessage", { channel, text });
  return { ts: data.ts as string, channel: data.channel as string };
}

export async function slackVerifyMessage(token: string, channel: string, ts: string) {
  const data = await call(token, "conversations.history", { channel, latest: ts, inclusive: true, limit: 1 });
  const messages = (data.messages ?? []) as { ts?: string }[];
  return messages.some((m) => m.ts === ts);
}
