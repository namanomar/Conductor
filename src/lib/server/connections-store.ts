import { getDb, collections } from "./mongodb";
import { encryptSecret, decryptSecret } from "./crypto";
import type { AppId, ConnectionMode, DataMode } from "@/lib/types";

export interface ConnectionCredential {
  type: "oauth" | "api_key" | "mcp_token";
  accessTokenEnc: string;
  refreshTokenEnc?: string;
  /** provider-specific extras, e.g. Atlassian cloudId, Slack team id */
  meta?: Record<string, string>;
}

export interface ConnectionDoc {
  _id: AppId;
  connected: boolean;
  mode: ConnectionMode;
  dataMode: DataMode;
  config?: string;
  credential?: ConnectionCredential;
  lastSyncedAt?: string;
  updatedAt: string;
}

export interface ConnectionPublic {
  id: AppId;
  connected: boolean;
  mode: ConnectionMode;
  dataMode: DataMode;
  config?: string;
  credentialType?: ConnectionCredential["type"];
  lastSyncedAt?: string;
}

function toPublic(doc: ConnectionDoc): ConnectionPublic {
  return {
    id: doc._id,
    connected: doc.connected,
    mode: doc.mode,
    dataMode: doc.dataMode,
    config: doc.config,
    credentialType: doc.credential?.type,
    lastSyncedAt: doc.lastSyncedAt,
  };
}

export async function getConnection(app: AppId): Promise<ConnectionDoc | null> {
  const db = await getDb();
  return db.collection<ConnectionDoc>(collections.connections).findOne({ _id: app });
}

export async function getConnectionPublic(app: AppId): Promise<ConnectionPublic | null> {
  const doc = await getConnection(app);
  return doc ? toPublic(doc) : null;
}

export async function listConnectionsPublic(): Promise<ConnectionPublic[]> {
  const db = await getDb();
  const docs = await db.collection<ConnectionDoc>(collections.connections).find().toArray();
  return docs.map(toPublic);
}

export async function upsertConnectionSettings(
  app: AppId,
  patch: Partial<Pick<ConnectionDoc, "mode" | "dataMode" | "config">>
): Promise<void> {
  const db = await getDb();

  // Only keep keys that were actually provided — an own property with value
  // `undefined` still survives `{...patch}` and would collide with the same
  // field in $setOnInsert, which MongoDB rejects.
  const set: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (patch.mode !== undefined) set.mode = patch.mode;
  if (patch.dataMode !== undefined) set.dataMode = patch.dataMode;
  if (patch.config !== undefined) set.config = patch.config;

  const setOnInsert: Record<string, unknown> = { connected: false };
  if (set.mode === undefined) setOnInsert.mode = "direct";
  if (set.dataMode === undefined) setOnInsert.dataMode = "live";

  await db.collection<ConnectionDoc>(collections.connections).updateOne(
    { _id: app },
    { $set: set, $setOnInsert: setOnInsert },
    { upsert: true }
  );
}

export async function saveCredential(
  app: AppId,
  credential: {
    type: ConnectionCredential["type"];
    accessToken: string;
    refreshToken?: string;
    meta?: Record<string, string>;
  }
): Promise<void> {
  const db = await getDb();
  const doc: ConnectionCredential = {
    type: credential.type,
    accessTokenEnc: encryptSecret(credential.accessToken),
    refreshTokenEnc: credential.refreshToken ? encryptSecret(credential.refreshToken) : undefined,
    meta: credential.meta,
  };
  await db.collection<ConnectionDoc>(collections.connections).updateOne(
    { _id: app },
    {
      $set: { connected: true, credential: doc, updatedAt: new Date().toISOString() },
      $setOnInsert: { mode: "direct", dataMode: "live" },
    },
    { upsert: true }
  );
}

export async function disconnectApp(app: AppId): Promise<void> {
  const db = await getDb();
  await db.collection<ConnectionDoc>(collections.connections).updateOne(
    { _id: app },
    { $set: { connected: false, updatedAt: new Date().toISOString() }, $unset: { credential: "" } }
  );
}

export async function markSynced(app: AppId): Promise<void> {
  const db = await getDb();
  await db.collection<ConnectionDoc>(collections.connections).updateOne(
    { _id: app },
    { $set: { lastSyncedAt: new Date().toISOString() } }
  );
}

export function getAccessToken(doc: ConnectionDoc): string | null {
  if (!doc.credential) return null;
  return decryptSecret(doc.credential.accessTokenEnc);
}
