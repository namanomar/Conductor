import { ObjectId } from "mongodb";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { getDb, collections } from "./mongodb";

export interface UserDoc {
  _id: ObjectId;
  username: string;
  passwordHash: string;
  createdAt: string;
}

function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, salt, 64);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export async function createUser(username: string, password: string): Promise<{ id: string; username: string }> {
  const db = await getDb();
  const users = db.collection<Omit<UserDoc, "_id">>(collections.users);

  await users.createIndex({ username: 1 }, { unique: true });

  const existing = await users.findOne({ username: username.toLowerCase() });
  if (existing) throw new Error("That username is already taken");

  const doc = {
    username: username.toLowerCase(),
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };
  const result = await users.insertOne(doc);
  return { id: result.insertedId.toString(), username: doc.username };
}

export async function verifyLogin(username: string, password: string): Promise<{ id: string; username: string } | null> {
  const db = await getDb();
  const user = await db.collection<UserDoc>(collections.users).findOne({ username: username.toLowerCase() });
  if (!user) return null;
  if (!verifyPassword(password, user.passwordHash)) return null;
  return { id: user._id.toString(), username: user.username };
}

export async function getUserById(id: string): Promise<{ id: string; username: string } | null> {
  const db = await getDb();
  try {
    const user = await db.collection<UserDoc>(collections.users).findOne({ _id: new ObjectId(id) });
    return user ? { id: user._id.toString(), username: user.username } : null;
  } catch {
    return null;
  }
}
