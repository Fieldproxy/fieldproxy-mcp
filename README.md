# Fieldproxy MCP server

The official [Model Context Protocol](https://modelcontextprotocol.io) server for [Fieldproxy](https://www.fieldproxy.ai), AI-native field service management.

It lets the AI assistant your team already uses (Claude, ChatGPT, Microsoft 365 Copilot and Teams, GitHub Copilot, Cursor, OpenAI Codex, Claude Code, or any MCP client) read and change a Fieldproxy workspace, and build on it, with a person confirming every change.

**The part no other field service MCP server does:** your AI can change the software itself. Ask for a new field, screen, table, automation or agent, and it is built as a draft in a sandbox copy of your workspace and goes live only when an administrator approves, with rollback.

- Overview: https://www.fieldproxy.ai/mcp
- Which field service software has an MCP server (verified comparison): https://www.fieldproxy.ai/mcp#which-fsm-has-mcp

> This repository holds documentation and client configuration. The server itself is hosted by Fieldproxy; there is nothing to install or run.

## Addresses

Use the address for your workspace's region.

| Region | Address |
|---|---|
| US East | `https://api-us-east-1.fieldproxy.ai/mcp` |
| Canada | `https://api-canada.fieldproxy.ai/mcp` |
| India | `https://api-india-1.fieldproxy.ai/mcp` |
| Norway | `https://api-norway.fieldproxy.ai/mcp` |
| New Zealand | `https://api-nz.fieldproxy.ai/mcp` |

Transport: streamable HTTP. Auth: OAuth 2.0 with dynamic client registration (sign in with workspace ID, email and password), or a bearer key (`fpmcp.…`).

## Before you connect

AI assistant access is **off by default**. Fieldproxy switches it on per workspace (Portal, Org features, AI assistant access, Enabled, and optionally Allow build). Ask your Fieldproxy contact, or [book a demo](https://www.fieldproxy.ai/book-demo?source=github-mcp).

Keys (`fpmcp.…`) are made in the Fieldproxy web app under **Settings, AI assistant, New key**. Each key is shown once. An administrator can set up a key for someone else; that person claims it once from their own screen, so the administrator never sees the key.

## Connect a client

### Claude (Desktop and claude.ai)
Add a custom connector with your region's address, then sign in with workspace ID, email and password and tick the scopes. The sign-in lasts 1 hour and renews itself for 30 days. Guide: https://www.fieldproxy.ai/mcp/claude

### Claude Code
```bash
claude mcp add --transport http fieldproxy https://api-us-east-1.fieldproxy.ai/mcp \
  --header "Authorization: Bearer fpmcp.…"
```

### ChatGPT (web: Plus, Pro, Business, Enterprise, Edu)
1. Settings, Security and login: turn on **Developer mode**.
2. Create a developer-mode app named **Fieldproxy** with your region's address, and choose **OAuth with dynamic client registration**.
3. Sign in on the Fieldproxy page and tick the permissions to allow.

ChatGPT asks before each write action by default; Fieldproxy's own confirm step still applies on top. Guide: https://www.fieldproxy.ai/mcp/chatgpt

### OpenAI Codex (CLI, IDE extension, desktop)
```bash
export FIELDPROXY_MCP_KEY="fpmcp.…"
codex mcp add fieldproxy --url https://api-us-east-1.fieldproxy.ai/mcp --bearer-token-env-var FIELDPROXY_MCP_KEY
```
Or in `~/.codex/config.toml`: see [`examples/codex-config.toml`](examples/codex-config.toml). To sign in instead of using a key, add the server without `--bearer-token-env-var`, then run `codex mcp login fieldproxy`.

### GitHub Copilot in VS Code
Copy [`examples/vscode-mcp.json`](examples/vscode-mcp.json) to `.vscode/mcp.json`. VS Code asks for the key once and hides it. Leave out `headers` to sign in through the Fieldproxy page instead.

### Microsoft 365 Copilot and Teams (Copilot Studio)
1. In your Copilot Studio agent: **Tools, Add a tool, New tool, Model Context Protocol**.
2. Name it Fieldproxy, add a one-line description, and enter your region's address.
3. Authentication: **OAuth 2.0, Dynamic discovery** (each person signs in with their own Fieldproxy account), or API key, type Header, name `Authorization`, value `Bearer fpmcp.…`.
4. Create the connection, **Add to agent**, then publish the agent to Teams and Microsoft 365 Copilot.

Copilot Studio needs its own Microsoft licence, and a Power Platform data policy can block the connection. Guide: https://www.fieldproxy.ai/mcp/copilot

### Cursor and other JSON-config clients
See [`examples/cursor-mcp.json`](examples/cursor-mcp.json).

## What it can do

145 built-in tools, plus up to 14 Command Center ready-made reads and any tools the workspace defines itself (saved SQL tools).

| Area | What it can do |
|---|---|
| Read | Schema and SELECT-only SQL. Customers, jobs, technicians, invoices, quotes, contracts. AR ageing, technician performance, funnels. |
| Write | Propose a change, confirm it, undo it. CSV import and export, record history, revert a record, restore deleted records. |
| Dispatch and maps | Spread jobs across technicians, plan daily routes, apply the schedule. Addresses, drive times, nearest technicians, live locations and routes, job sign-off links. |
| Comms | Search the inbox and read threads. Draft emails and SMS (with templates), then confirm the send. Notifications, comments, email follow-ups, list and place calls. |
| Sales documents | Preview and issue proposals, generate estimates and PDF documents. |
| Files and photos | Read PDF, Word, Excel, CSV and email files. View job photos, up to 10 at a time. |
| Monitoring | Dashboards, alerts, scheduled reports, the activity feed, insights, usage. |
| Automation operations | Run a rule, retry or dismiss failed runs, decide approvals (named approvers only). |
| Workspace settings | Service zones, saved views, Command Center memory. |
| AI oversight (admins) | Every AI connection in the workspace, what each one did, usage by key, person and tool, revoking access. |
| **Build** | **Apps: validate, draft, publish, roll back. Tables and columns (nothing is ever dropped). Automations and voice or text agents: validate, save, simulate, enable, restore a version. Document, email, proposal and estimate templates.** |
| Sandbox | Copy the workspace, build in the copy, then plan and confirm a promotion to live. |

Seven ready-made workflows (prompts): `daily_ops_briefing`, `plan_the_schedule`, `triage_my_inbox`, `why_did_this_automation_fail`, `customer_360`, `build_an_app`, `build_a_dashboard`.

## Scopes

| Scope | Requires | Unlocks |
|---|---|---|
| `data:read` | Command Center on, and the user has Command Center access | Schema, ready-made reads, read-only SQL |
| `data:write` | Tables the workspace lets Command Center write, and no approval gate | Writes with undo, email and SMS drafts |
| `build` | An administrator, plus Allow build on the workspace | Apps, tables, automations, agents, sandboxes |

The user's own Command Center access sets the ceiling. A key can be limited further: expiry (1 hour to 90 days), tables, rows (for example "only team A's jobs"), hidden columns, insert/update/delete, and switches for SQL, sending and build areas. Postgres enforces row limits, and hidden columns are removed from every result.

## Guardrails

- **Confirm before change.** Every write, send or action is a proposal the user confirms within 30 minutes. Writes can be undone. More than 5 rows needs bulk permission; more than 1,000 is refused.
- **Builds save as drafts.** Saving or publishing is blocked if the linter, a SQL check against the database, or a navigation check finds a new error. New automations and agents are saved switched off. Public apps are never published or changed.
- **Sends are limited.** Email goes only from the user's own mailbox, at most 20 sends an hour per key, inside the workspace's quiet hours. A sandbox never sends.
- **Stateless and audited.** Every request is authorised from scratch, so a revoked key is refused on the next call. Every call is logged with the tool, key, person and outcome.

## Example asks

- "What did we finish last week that nobody invoiced?"
- "Mike is out sick. Move his jobs to whoever is closest and show me the plan."
- "Which quotes over $5,000 have had no follow-up in two weeks? Draft the emails."
- "Add a warranty expiry date to every job, and alert the service manager 30 days before one runs out."
- "Build a subcontractor compliance screen that flags missing insurance."

## Links

- Overview: https://www.fieldproxy.ai/mcp
- Claude: https://www.fieldproxy.ai/mcp/claude
- ChatGPT: https://www.fieldproxy.ai/mcp/chatgpt
- Microsoft 365 Copilot and Teams: https://www.fieldproxy.ai/mcp/copilot
- Book a demo: https://www.fieldproxy.ai/book-demo?source=github-mcp
