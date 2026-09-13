# Setup

Conductor is a single Next.js app (frontend + API routes + execution engine).
Nothing is faked: connections make real OAuth/API calls, "Synced" data mode
writes real documents to MongoDB, and the reasoning step in a run is a real
OpenAI call. Anything you haven't configured yet just shows a clear
"not connected" / "missing env var" error in the UI — it doesn't fall back to
fake data.

## 1. Install and copy the env file

```bash
npm install
cp .env.local.example .env.local
```

## 2. MongoDB (Atlas free tier)

1. Go to https://www.mongodb.com/cloud/atlas/register and create a free account.
2. Create a free (M0) cluster.
3. Under **Database Access**, create a database user with a password.
4. Under **Network Access**, add your current IP (or `0.0.0.0/0` for local dev only).
5. Click **Connect > Drivers**, copy the connection string, and put it in
   `.env.local` as `MONGODB_URI` — it looks like:
   ```
   mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
   ```

Conductor uses one database, `conductor`, with four collections it creates
automatically: `connections`, `synced_items`, `workflows`, `runs`.

## 3. Token encryption key

Stored OAuth/API tokens are encrypted at rest with AES-256-GCM. Generate a key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Put the result in `.env.local` as `TOKEN_ENCRYPTION_KEY`.

## 4. OpenAI

Put an API key in `.env.local` as `OPENAI_API_KEY`. Powers:

- The "Generate" box on the Workflow Builder (prompt → node graph).
- The `reason` step during a run (real evidence → root-cause hypothesis + confidence).

## 5. Connect each app

Each app supports two connection types, chosen per-app on the **Connections** page:

- **MCP** — connects to that vendor's hosted MCP server using a bearer token you paste in:

  - GitHub: `https://api.githubcopilot.com/mcp/`
  - Slack: `https://mcp.slack.com/mcp`
  - Jira/Atlassian: `https://mcp.atlassian.com/v1/mcp`
  - PagerDuty: `https://mcp.pagerduty.com/mcp`

  These official MCP servers expect a real OAuth-issued access token for
  their own auth flow. The simplest way to get one for testing is to
  authorize via each vendor's own MCP-compatible client (e.g. Claude Code,
  Cursor) once and copy the resulting access token, or use a personal
  access token where the vendor accepts one. Conductor's MCP connector is
  a generic bearer-token client — it does not run its own OAuth dance
  against these endpoints.
- **Direct** — for GitHub, Slack, and Jira this is a normal OAuth 2.0 flow
  run by Conductor itself; for PagerDuty (no public self-serve OAuth app)
  it's a REST API key.

### GitHub (Direct = OAuth)

1. https://github.com/settings/developers → **New OAuth App**.
2. Authorization callback URL: `http://localhost:3000/api/connections/github/oauth/callback`
3. Put the client ID/secret in `.env.local` as `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`.
4. On the Connections page, set the **Repository** config field to `owner/repo`.

### Slack (Direct = OAuth)

1. https://api.slack.com/apps → **Create New App** → From scratch.
2. Under **OAuth & Permissions**, add redirect URL: `http://localhost:3000/api/connections/slack/oauth/callback`
3. Add bot token scopes: `channels:read`, `channels:history`, `chat:write`.
4. Install the app to your workspace, then put the client ID/secret in
   `.env.local` as `SLACK_CLIENT_ID` / `SLACK_CLIENT_SECRET`.
5. Invite the bot to the channel you want to use, and set the **Channel ID**
   config field on the Connections page (e.g. `C0123456789`).

### Jira / Atlassian (Direct = OAuth, or API token)

**OAuth:**

1. https://developer.atlassian.com/console/myapps/ → **Create app** → OAuth 2.0 integration.
2. Callback URL: `http://localhost:3000/api/connections/jira/oauth/callback`
3. Add scopes: `read:jira-work`, `write:jira-work`, `offline_access`.
4. Put the client ID/secret in `.env.local` as `JIRA_CLIENT_ID` / `JIRA_CLIENT_SECRET`.

**Or API token** (no OAuth app needed): on the Connections page, switch to
Direct mode and fill in your Atlassian site URL (`https://yoursite.atlassian.net`),
your account email, and an API token from
https://id.atlassian.com/manage-profile/security/api-tokens.

Either way, set the **Project key** config field (e.g. `PROJ`).

### PagerDuty (Direct = API key)

1. PagerDuty → **Integrations → API Access Keys** → create a key (a general
   account-level key is fine — Conductor validates it against `/abilities`,
   which works for both account-level keys and personal user tokens).
2. Paste it directly into the Connections page (no env var needed —
   `PAGERDUTY_API_KEY` in `.env.local` is not read; the key only needs to be
   entered once in the UI, where it's encrypted and stored in MongoDB).
3. Optionally set the **Service ID** config field to scope incident lookups to one service.

## 6. Data mode: Live vs Synced

Per connection, independent of MCP/Direct:

- **Live** — every investigate/verify step calls the app's API in real time.
- **Synced** — click **Sync now** on the Connections page to pull that app's
  recent items (PRs, issues, messages, incidents) into the `synced_items`
  collection in MongoDB. (Sync currently uses the Direct/OAuth REST path;
  MCP-mode connections don't sync yet — see the note in the UI.)

## 7. Run it

```bash
npm run dev
```

- `/app/connections` — connect apps, set config, choose Live/Synced.
- `/app/workflows` — drag-and-drop builder, or type a prompt and click
  **Generate** to have OpenAI draft the graph, then **Run**.
- `/app/runs` — history of runs; click one to watch it execute live
  (nodes light up as they run) and click any node to see its log/output.
  Runs with an approval gate pause until you click **Approve**.

Nothing works "for free" without the above — that's intentional. Connect
what you have; anything unconnected will show up as a clear error on the
node that needed it, in that node's log panel, rather than pretending to
succeed.
