function readEnv(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

export const env = {
  appBaseUrl: () => readEnv("APP_BASE_URL") || "http://localhost:3000",
  mongoUri: () => readEnv("MONGODB_URI"),
  openaiApiKey: () => readEnv("OPENAI_API_KEY"),
  tokenEncryptionKey: () => readEnv("TOKEN_ENCRYPTION_KEY"),
  sessionSecret: () => readEnv("SESSION_SECRET") || readEnv("TOKEN_ENCRYPTION_KEY"),

  github: {
    clientId: () => readEnv("GITHUB_CLIENT_ID"),
    clientSecret: () => readEnv("GITHUB_CLIENT_SECRET"),
  },
  slack: {
    clientId: () => readEnv("SLACK_CLIENT_ID"),
    clientSecret: () => readEnv("SLACK_CLIENT_SECRET"),
  },
  jira: {
    clientId: () => readEnv("JIRA_CLIENT_ID"),
    clientSecret: () => readEnv("JIRA_CLIENT_SECRET"),
  },
  pagerduty: {
    apiKey: () => readEnv("PAGERDUTY_API_KEY"),
  },
};
