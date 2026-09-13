import { MongoClient, type Db } from "mongodb";
import { env } from "./env";

declare global {
  // eslint-disable-next-line no-var
  var __conductorMongoClientPromise: Promise<MongoClient> | undefined;
}

function createClientPromise(): Promise<MongoClient> {
  const uri = env.mongoUri();
  if (!uri) {
    return Promise.reject(new Error("The database isn't configured yet."));
  }
  const client = new MongoClient(uri);
  return client.connect();
}

function getClientPromise(): Promise<MongoClient> {
  if (!global.__conductorMongoClientPromise) {
    global.__conductorMongoClientPromise = createClientPromise();
  }
  return global.__conductorMongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db("conductor");
}

export const collections = {
  connections: "connections",
  customConnections: "custom_connections",
  syncedItems: "synced_items",
  workflows: "workflows",
  runs: "runs",
  schedules: "schedules",
  users: "users",
} as const;
