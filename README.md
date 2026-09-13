# Conductor

### AI agents that operate your enterprise — not just chat about it.

Conductor is a platform for connecting your team's tools (Slack, GitHub, Jira, PagerDuty, or anything else that speaks MCP), building multi-step agent workflows on a drag-and-drop canvas, and running them with **verified execution** — every write action is independently re-checked after it runs, so "the agent said it worked" is never the end of the story.

**Incident Commander** — an autonomous incident commander that investigates production incidents across four real apps, proposes a response, and proves every action it takes actually landed — is the flagship workflow built on top of it, and the live demo.

---

## The problem

When a production incident fires, an engineer's first ten minutes look the same almost everywhere:

- Open PagerDuty, read the alert.
- Tab to Slack, scroll for "did someone just deploy?"
- Tab to GitHub, scan recent PRs for anything suspicious.
- Tab to Jira, search for a ticket that might already describe this.
- Piece it together by hand, then manually post an update, open a ticket, and file a follow-up issue — hoping nothing falls through the cracks under pressure.

None of that is engineering. It's context-switching, and it's expensive: industry MTTR (mean-time-to-resolution) benchmarks put the *cost of downtime* for a mid-size SaaS company at **thousands of dollars per minute**, and a meaningful fraction of that time is spent gathering context across tools, not fixing the bug. Shaving even a few minutes off every incident, every week, compounds into real budget — and it frees senior engineers from being human API-glue between four tabs.

Conductor automates exactly that first ten minutes — and unlike a chatbot wrapper, it actually does the work: it calls the real APIs, writes the real ticket, posts the real message, and then checks its own homework.

## The 10-second pitch

> Point Conductor at your incident. It reads PagerDuty, searches Slack and GitHub and Jira for what's relevant, asks OpenAI to form a hypothesis, shows you exactly what it wants to do, waits for your approval, does it, and then re-fetches every single thing it created to prove it's really there. You watch all of it happen live, node by node, on a canvas — not in a wall of chat text.

## What's actually real here

This is the part that matters most for a hackathon demo, so it comes first: **nothing here is scripted or faked.**

| Claim | How it's actually true |
|---|---|
| Real connections | Genuine OAuth 2.0 flows for GitHub, Slack, and Jira/Atlassian; a real API-key auth path for PagerDuty; a real MCP client (`@modelcontextprotocol/sdk`) for any MCP-hosted server, including vendor-hosted ones (`api.githubcopilot.com/mcp`, `mcp.slack.com`, `mcp.atlassian.com`, `mcp.pagerduty.com`) |
| Real reasoning | The "reason" step is a genuine OpenAI call over the evidence actually gathered *that run* — it will report low confidence honestly if the evidence is thin, rather than inventing a confident story |
| Real actions | Investigate/action nodes hit the real GitHub, Slack, Jira, and PagerDuty REST APIs. An app that isn't connected reports a real, specific error — it never silently substitutes fake data |
| Real verification | The verify step re-fetches the exact resource an action created — the Slack message timestamp, the GitHub issue number, the Jira issue key — and confirms it exists, independently of whatever the write call claimed |
| Real persistence | Connections, credentials (encrypted at rest, AES-256-GCM), synced data, saved workflows, and full run history all live in MongoDB — nothing resets on refresh |
| Real-time UI | A run streams live per-node status to the browser over Server-Sent Events; click any node mid-run to see its log and output update in place |

If a piece isn't configured, the UI says exactly what's missing and where to fix it — it never degrades into a fake success.

## Execution Proof — the killer feature

Every workflow ends with independent verification, not a trust-me:

```
ACTION → API response → Re-fetch → Exists? → ✓ / ✗

Execution Proof
Actions attempted       3
Actions successful      3
Actions verified        3

✓ Slack message verified
✓ Jira ticket verified
✓ GitHub issue verified
```

That's the answer to "how do you know it actually worked" — the agent doesn't just claim success, it proves it, on camera, in the demo.

## Incident Commander — a full run

```
🔴 PagerDuty: checkout-api latency has exceeded 2 seconds for 8 minutes.
```

1. **Trigger** — reads the live open incident from PagerDuty.
2. **Investigate** — in parallel, searches Slack for deployment chatter (filtered to the incident's own keywords, with automatic fallback if nothing matches), searches GitHub for relevant recent PRs, and searches Jira for related issues.
3. **Reason** — OpenAI synthesizes the gathered evidence into a root-cause hypothesis with an honest confidence score, *and* drafts distinct, purpose-written content for each downstream action (a Slack update reads like a Slack update; a Jira ticket reads like a ticket — not one paragraph copy-pasted three times).
4. **Approve** — a human clicks Approve before anything gets written anywhere. No write action ever runs unattended.
5. **Act** — posts the Slack update, creates the Jira incident ticket, opens the GitHub investigation issue, each cross-linked to the same evidence.
6. **Verify** — re-fetches all three and confirms they're real.

Every one of those six steps is a node you can click, mid-run, to see exactly what it did and why.

## Platform capabilities

Incident Commander is one workflow. The platform underneath is generic:

- **Connections** — OAuth, direct API key, or MCP for the 4 built-in apps; for anything else, add a **custom connection** by plain access token, or by a fully generic **OAuth flow you configure yourself** (authorize URL, token URL, client ID/secret) for providers like Notion that require real OAuth and reject a bare token.
- **Live vs. Synced data** — per connection, query the app live at run time, or sync a local copy into MongoDB for instant, repeatable evidence graphs.
- **Drag-and-drop workflow builder** — trigger → investigate → reason → approval → action → verify, wired visually. Every MCP-connected source's tools appear as **individually draggable nodes**, discovered live from that server's own tool schema — connect a new MCP tool and it shows up in the palette with no code changes.
- **Prompt-to-workflow** — describe an automation in plain English and OpenAI drafts the smallest graph that actually does it (a simple lookup becomes 2 nodes, not a padded 6-node template it doesn't need).
- **Scheduled runs** — attach a recurring interval (5 min to daily) to any saved workflow; a background scheduler fires it automatically and logs every run.
- **AI chat assistant** — a slide-out panel, available on every console page, backed by a real OpenAI tool-calling agent over your connections (and any custom/MCP tools you've added). Ask it to check on something and watch each tool call stream in live — "Searching Slack… ✓" — before the final answer.
- **Workflow library** — every saved workflow, reopenable and editable, not just the one demo template.
- **In-app setup docs** — a `/docs` page inside the console walks through connecting each app, so nothing lives only in this file.

## Architecture

A single Next.js app — no separate backend service, no microservices to spin up for a demo.

```
┌─────────────────────────────────────────────────────────────┐
│                      Next.js App Router                     │
│  ┌───────────────┐   ┌────────────────┐   ┌───────────────┐ │
│  │  Landing page │   │ Console (SPA)  │   │  API routes   │ │
│  │      "/"      │   │ Runs/Workflows │   │  /api/**      │ │
│  │               │   │ Connections    │   │               │ │
│  └───────────────┘   └────────────────┘   └───────┬───────┘ │
└───────────────────────────────────────────────────┼─────────┘
                                                      │
              ┌───────────────────────────────────────┼───────────────────────┐
              ▼                     ▼                  ▼                      ▼
     ┌────────────────┐   ┌─────────────────┐  ┌──────────────┐   ┌────────────────────┐
     │  Execution      │   │  OpenAI          │  │  MongoDB     │   │  MCP client         │
     │  engine         │   │  (reason step,   │  │  connections │   │  (@modelcontext-    │
     │  (topological    │   │  chat agent,     │  │  runs        │   │  protocol/sdk)      │
     │  DAG runner)     │   │  prompt→workflow)│  │  workflows   │   │  → vendor + custom  │
     └────────┬─────────┘   └─────────────────┘  │  schedules   │   │    MCP servers      │
              │                                   └──────────────┘   └────────────────────┘
              ▼
     ┌─────────────────────────────────────────────────────────┐
     │      Direct REST connectors (real API calls)              │
     │      PagerDuty · Slack · GitHub · Jira                    │
     └─────────────────────────────────────────────────────────┘
```

### Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack), TypeScript |
| Styling | Tailwind CSS v4, Framer Motion |
| Workflow canvas | `@xyflow/react` (React Flow) |
| Database | MongoDB — connections, encrypted credentials, synced data, workflows, run history, schedules |
| AI | OpenAI (Chat Completions, tool calling) — reasoning, prompt-to-workflow, chat assistant |
| Integrations | Real OAuth 2.0 (GitHub, Slack, Atlassian), API keys (PagerDuty), MCP (`@modelcontextprotocol/sdk`) |
| Realtime | Server-Sent Events for live run status |
| Security | AES-256-GCM credential encryption at rest |

## Why it matters (the economics)

- **Time is the cost.** Every minute of MTTR is a minute of lost revenue, SLA risk, and on-call fatigue. Automating the first-response ritual — gather context, hypothesize, propose, verify — turns a 10-15 minute manual scramble into a ~60-90 second automated pass with a single human approval click.
- **Trust is the adoption blocker.** Teams don't hand automation write access to production tooling without proof it worked — that's exactly why verification isn't a nice-to-have here, it's the core mechanic. An agent that proves its work is an agent teams will actually turn on.
- **It generalizes past incidents.** The same trigger → investigate → reason → approve → act → verify loop, the same connection model, and the same per-endpoint node system apply to any repetitive cross-tool workflow — onboarding checklists, release readiness checks, customer escalation triage. Incident Commander is the proof-of-concept; the platform is the product.

## Getting started

```bash
npm install
cp .env.local.example .env.local   # fill in what you have
npm run dev
```

Open [http://localhost:3000](http://localhost:3000):

| Route | What it is |
|---|---|
| `/` | Landing page |
| `/app/runs` | Run history — click a run to watch it execute live, node by node |
| `/app/workflows` | Drag-and-drop builder, prompt-to-workflow, scheduling |
| `/app/workflows/library` | Every saved workflow |
| `/app/connections` | Connect PagerDuty, Slack, GitHub, Jira, and custom MCP tools |
| `/app/docs` | In-app setup guide for every connection type |

Full setup instructions (MongoDB Atlas, OAuth app registration, exact redirect URIs, scopes) are in [SETUP.md](SETUP.md) and mirrored in-app at `/app/docs`.

## What's next

- Per-node argument configuration for dynamic MCP tool nodes (currently zero-arg only)
- Multi-user accounts with per-user scoped connections
- More trigger sources beyond PagerDuty (webhooks, scheduled polling of any connected app)
