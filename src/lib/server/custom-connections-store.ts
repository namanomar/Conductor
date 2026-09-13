import { ObjectId } from "mongodb";
import { getDb, collections } from "./mongodb";
import { encryptSecret, decryptSecret } from "./crypto";

export interface CustomOAuthConfig {
  authorizeUrl: string;
  tokenUrl: string;
  clientId: string;
  clientSecretEnc: string;
  scopes?: string;
  state?: string;
}

export interface CustomConnectionDoc {
  _id: ObjectId;
  userId: string;
  name: string;
  endpoint: string;
  status: "pending" | "connected";
  accessTokenEnc?: string;
  refreshTokenEnc?: string;
  toolCount: number;
  createdAt: string;
  oauth?: CustomOAuthConfig;
}

export interface CustomConnectionPublic {
  id: string;
  name: string;
  endpoint: string;
  toolCount: number;
  createdAt: string;
  authType: "token" | "oauth";
}

function toPublic(doc: CustomConnectionDoc): CustomConnectionPublic {
  return {
    id: doc._id.toString(),
    name: doc.name,
    endpoint: doc.endpoint,
    toolCount: doc.toolCount,
    createdAt: doc.createdAt,
    authType: doc.oauth ? "oauth" : "token",
  };
}

export async function listCustomConnections(userId: string): Promise<CustomConnectionPublic[]> {
  const db = await getDb();
  const docs = await db
    .collection<CustomConnectionDoc>(collections.customConnections)
    .find({ userId, status: "connected" })
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map(toPublic);
}

export async function createCustomConnection(
  userId: string,
  name: string,
  endpoint: string,
  token: string,
  toolCount: number
): Promise<CustomConnectionPublic> {
  const db = await getDb();
  const doc = {
    userId,
    name,
    endpoint,
    status: "connected" as const,
    accessTokenEnc: encryptSecret(token),
    toolCount,
    createdAt: new Date().toISOString(),
  };
  const result = await db.collection(collections.customConnections).insertOne(doc);
  return toPublic({ _id: result.insertedId, ...doc });
}

export async function createPendingOAuthConnection(
  userId: string,
  config: {
    name: string;
    endpoint: string;
    authorizeUrl: string;
    tokenUrl: string;
    clientId: string;
    clientSecret: string;
    scopes?: string;
  }
): Promise<{ id: string; state: string }> {
  const db = await getDb();
  const state = new ObjectId().toString() + Date.now().toString(36);
  const doc = {
    userId,
    name: config.name,
    endpoint: config.endpoint,
    status: "pending" as const,
    toolCount: 0,
    createdAt: new Date().toISOString(),
    oauth: {
      authorizeUrl: config.authorizeUrl,
      tokenUrl: config.tokenUrl,
      clientId: config.clientId,
      clientSecretEnc: encryptSecret(config.clientSecret),
      scopes: config.scopes,
      state,
    },
  };
  const result = await db.collection(collections.customConnections).insertOne(doc);
  return { id: result.insertedId.toString(), state };
}

export async function getPendingOAuthConnectionByState(state: string): Promise<CustomConnectionDoc | null> {
  const db = await getDb();
  return db
    .collection<CustomConnectionDoc>(collections.customConnections)
    .findOne({ status: "pending", "oauth.state": state });
}

export async function completeOAuthConnection(
  id: string,
  accessToken: string,
  refreshToken: string | undefined,
  toolCount: number
): Promise<void> {
  const db = await getDb();
  await db.collection<CustomConnectionDoc>(collections.customConnections).updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        status: "connected",
        accessTokenEnc: encryptSecret(accessToken),
        refreshTokenEnc: refreshToken ? encryptSecret(refreshToken) : undefined,
        toolCount,
      },
      $unset: { "oauth.state": "" },
    }
  );
}

export async function listCustomConnectionCredentials(
  userId: string
): Promise<{ id: string; name: string; endpoint: string; token: string }[]> {
  const db = await getDb();
  const docs = await db
    .collection<CustomConnectionDoc>(collections.customConnections)
    .find({ userId, status: "connected", accessTokenEnc: { $exists: true } })
    .toArray();
  return docs.map((doc) => ({
    id: doc._id.toString(),
    name: doc.name,
    endpoint: doc.endpoint,
    token: decryptSecret(doc.accessTokenEnc!),
  }));
}

export async function deleteCustomConnection(userId: string, id: string): Promise<void> {
  const db = await getDb();
  await db.collection(collections.customConnections).deleteOne({ _id: new ObjectId(id), userId });
}
