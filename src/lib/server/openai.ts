import OpenAI from "openai";
import { env } from "./env";

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  const apiKey = env.openaiApiKey();
  if (!apiKey) {
    throw new Error("AI reasoning isn't configured yet.");
  }
  if (!client) client = new OpenAI({ apiKey });
  return client;
}

export const OPENAI_MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
