# Fieldproxy MCP server

[![Fieldproxy MCP connector: tool definition quality and endpoint health on Glama](https://glama.ai/mcp/connectors/io.github.Fieldproxy/fieldproxy-mcp/badges/score.svg)](https://glama.ai/mcp/connectors/io.github.Fieldproxy/fieldproxy-mcp)

The official [Model Context Protocol](https://modelcontextprotocol.io) server for [Fieldproxy](https://www.fieldproxy.ai) field service management: connect Claude, ChatGPT, Copilot, Cursor or any MCP client to jobs, dispatch, invoices and quotes, with a person confirming every change.

The server is hosted by Fieldproxy (streamable HTTP). This repository holds the docs, client configs, runnable examples and a small stdio bridge for clients that cannot speak HTTP.

- Overview: https://www.fieldproxy.ai/mcp
- Developer docs: https://www.fieldproxy.ai/developers
- Sandbox page: https://www.fieldproxy.ai/developers/sandbox

## Try it in 60 seconds

There is a public, read-only sandbox you can connect to right now. It is a sample HVAC company, **Summit Heating & Air**, with made-up data: about 2,076 jobs, 435 customers in New York, 12 technicians, invoices, estimates, equipment and service agreements.

| | |
|---|---|
| Address | `https://api-uk.fieldproxy.ai/mcp` |
| Header | `Authorization: Bearer fpmcp.eleqia.pZWm5OR4qsYqP1Wb0DKsxm9bfs_vdI-DCHL5JJMPlxc` |
| Scope | `data:read` only. No writes, no email, no SMS. |
| Key expires | 4 February 2027 (rotated before then; this README and the sandbox page show the current key) |

The key is public on purpose. It can only read the sample data.

### Claude Code

```bash
claude mcp add --transport http fieldproxy-sandbox https://api-uk.fieldproxy.ai/mcp \
  --header "Authorization: Bearer fpmcp.eleqia.pZWm5OR4qsYqP1Wb0DKsxm9bfs_vdI-DCHL5JJMPlxc"
```

### Cursor (`.cursor/mcp.json`), or a project `.mcp.json`

```json
{
  "mcpServers": {
    "fieldproxy-sandbox": {
      "url": "https://api-uk.fieldproxy.ai/mcp",
      "headers": { "Authorization": "Bearer fpmcp.eleqia.pZWm5OR4qsYqP1Wb0DKsxm9bfs_vdI-DCHL5JJMPlxc" }
    }
  }
}
```

### Any MCP client that speaks streamable HTTP

```json
{
  "type": "http",
  "url": "https://api-uk.fieldproxy.ai/mcp",
  "headers": { "Authorization": "Bearer fpmcp.eleqia.pZWm5OR4qsYqP1Wb0DKsxm9bfs_vdI-DCHL5JJMPlxc" }
}
```

### Clients that only run local (stdio) servers, such as Claude Desktop

Use [`mcp-remote`](https://www.npmjs.com/package/mcp-remote) as a bridge:

```bash
npx -y mcp-remote https://api-uk.fieldproxy.ai/mcp \
  --header "Authorization: Bearer fpmcp.eleqia.pZWm5OR4qsYqP1Wb0DKsxm9bfs_vdI-DCHL5JJMPlxc"
```

In `claude_desktop_config.json` see [`examples/claude_desktop_config.json`](examples/claude_desktop_config.json) (the key goes in `env` so the space in the header survives on Windows).

Or use this repository's own bridge, published as [`@fieldproxy/mcp`](https://www.npmjs.com/package/@fieldproxy/mcp). With no settings it connects to the sandbox:

```json
{
  "mcpServers": {
    "fieldproxy": { "command": "npx", "args": ["-y", "@fieldproxy/mcp"] }
  }
}
```

### No client at all

Run one of the examples. They call `initialize`, then `run_sql`, and print the rows. No packages needed.

```bash
node examples/run_sql.mjs          # Node.js 18+
python3 examples/run_sql.py        # Python 3.8+
python3 examples/run_sql.py "SELECT name, role FROM st_technicians WHERE active"
```

Or with curl:

```bash
curl -s https://api-uk.fieldproxy.ai/mcp \
  -H "Authorization: Bearer fpmcp.eleqia.pZWm5OR4qsYqP1Wb0DKsxm9bfs_vdI-DCHL5JJMPlxc" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"run_sql","arguments":{"sql":"SELECT status, count(*) FROM st_jobs GROUP BY status"}}}'
```

### Things to ask

- "Call describe_schema, then tell me how many jobs are in each status."
- "Which job types do we run most often?"
- "List the scheduled jobs in Glen Cove with the customer's phone number."
- "Which technicians ran the most visits in the last 90 days?"
- "Which open estimates have had no follow-up for 30 days or more?"
- "Which customers own equipment more than 12 years old? Group it by customer."
- "How long is the drive from Garden City to Glen Cove?"
- "Plan the best route through tomorrow's scheduled visits."
- "Export every pending invoice to CSV."

The sandbox key is limited to the sample tables, so `run_sql` refuses SQL functions that could read other tables, such as `sum()` and `avg()`. `count()`, `max()`, `GROUP BY`, joins and date filters work. A key on your own workspace does not need that limit.

### Sandbox REST API

The same company is also open on the REST API, read only:

```bash
curl -X POST https://api-uk.fieldproxy.ai/api/read \
  -H "x-api-key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyaWQiOiJ0ZXN0IiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwidGVuYW50X2lkIjoiZWxlcWlhIiwidHlwZSI6ImFwaV9rZXkiLCJqdGkiOiI0YzliYjgwZi0yY2U2LTQ4ODYtYjk2NS1kMjA2YWU4ODczMWEiLCJpYXQiOjE3OTM5NTU3NTEsImV4cCI6MTgyNTQ5MTc1MX0.SgIxGkXEqMPbikAoX4D7H4coOUvnlrsJYb-uA8_ixNA" \
  -H "content-type: application/json" \
  -d '{"tableName": "st_customers", "condition": {"id": 1}}'
```

## Sandbox tools

The sandbox key exposes 21 tools (read live from `tools/list` on 6 November 2026). The tool list is built per key, so the tools you see depend on the key's scopes and limits.

| Tool | What it does |
|---|---|
| `describe_schema` | Lists the tables the key may read, or the columns of named tables. |
| `run_sql` | Runs one read-only SELECT (up to 500 rows, 5-second limit). |
| `search_freeform` | Runs a read-only SELECT or WITH query when no other tool fits. |
| `list_distinct_values` | Distinct values in a column with row counts, such as job statuses. |
| `explain_change` | Explains why a number changed between two periods, split by a column. |
| `export_csv` | Saves a SELECT result as a CSV file (up to 10,000 rows) and returns a link. |
| `open_record` | Returns a link that opens one record in the Fieldproxy web app. |
| `list_record_files` | Lists the photos, PDFs and signatures stored on one record. |
| `generate_pdf` | Turns HTML (a quote, job report, summary) into a PDF link. |
| `list_dashboards` | Command Center dashboards the key can see. |
| `view_dashboard` | Each tile of a dashboard with its current data. |
| `list_alerts` | Data alerts and when they last ran. |
| `list_scheduled_reports` | Scheduled reports, cadence, next and last run. |
| `workspace_usage` | Record and seat limits and this month's AI credits. |
| `geocode_address` | Coordinates for up to 10 addresses. |
| `reverse_geocode` | The street address nearest to a coordinate. |
| `drive_time` | Road drive time and distance between two places. |
| `calculate_route` | The best order to visit up to 50 stops. |
| `get_widget_docs` | Fieldproxy's app-building reference. |
| `get_automation_docs` | Fieldproxy's automation reference. |
| `log_turn` | Saves the conversation turn to the user's Command Center history. |

The server also offers seven ready-made prompts: `daily_ops_briefing`, `plan_the_schedule`, `triage_my_inbox`, `why_did_this_automation_fail`, `customer_360`, `build_an_app`, `build_a_dashboard`.

## Connect your own workspace

A full workspace key has 170+ built-in tools, plus any SQL tools the workspace saves for its AI.

| Area | What it can do |
|---|---|
| Read | Schema and SELECT-only SQL. Customers, jobs, technicians, invoices, quotes, contracts. AR ageing, technician performance, funnels. |
| Write | Propose a change, confirm it, undo it. CSV import and export, record history, revert a record, restore deleted records. |
| Dispatch and maps | Spread jobs across technicians, plan daily routes, apply the schedule. Drive times, nearest technicians, live locations, job sign-off links. |
| Comms | Search the inbox and read threads. Draft emails and SMS from templates, then send after you confirm. Comments, notifications, follow-ups and calls. |
| Sales documents | Preview and issue proposals, generate estimates and PDF documents. |
| Files and photos | Read PDF, Word, Excel, CSV and email files. View job photos. |
| Monitoring | Dashboards, alerts, scheduled reports, the activity feed, usage. |
| Automation operations | Run a rule, retry or dismiss failed runs, decide approvals. |
| AI oversight (admins) | Every AI connection in the workspace, what each one did, usage by key, person and tool, revoking access. |
| Build | Apps, tables and columns, automations, voice and text agents, document and email templates. Saved as drafts; new automations and agents are saved switched off. |
| Sandbox copy | Copy the workspace, build in the copy, then plan and confirm a promotion to live. |

### Addresses

Each workspace lives in one region. Your address is shown in **Settings, AI assistant**.

| Region | Address |
|---|---|
| US East | `https://api-us-east-1.fieldproxy.ai/mcp` |
| Canada | `https://api-canada.fieldproxy.ai/mcp` |
| UK | `https://api-uk.fieldproxy.ai/mcp` |
| India | `https://api-india-1.fieldproxy.ai/mcp` |
| Norway | `https://api-norway.fieldproxy.ai/mcp` |
| New Zealand | `https://api-nz.fieldproxy.ai/mcp` |

AI assistant access is off by default. Fieldproxy switches it on per workspace. Ask your Fieldproxy contact, or [book a demo](https://www.fieldproxy.ai/book-demo?source=github-mcp).

### OAuth or a key

- **OAuth (sign in).** Claude, ChatGPT and Microsoft Copilot Studio connect with OAuth and dynamic client registration: add the address, sign in with workspace ID, email and password, and tick the scopes. The sign-in lasts 1 hour and renews itself for 30 days. Guides: [Claude](https://www.fieldproxy.ai/mcp/claude), [ChatGPT](https://www.fieldproxy.ai/mcp/chatgpt), [Microsoft 365 Copilot and Teams](https://www.fieldproxy.ai/mcp/copilot).
- **Key.** Make one in the web app under **Settings, AI assistant, New key**. Keys start with `fpmcp.` and are shown once. Send it as `Authorization: Bearer fpmcp.…`. An administrator can set up a key for someone else; that person claims it once from their own screen, so the administrator never sees it.

### Client setup with a key

Claude Code:

```bash
claude mcp add --transport http fieldproxy https://api-us-east-1.fieldproxy.ai/mcp \
  --header "Authorization: Bearer fpmcp.YOUR_KEY"
```

OpenAI Codex:

```bash
export FIELDPROXY_MCP_KEY="fpmcp.YOUR_KEY"
codex mcp add fieldproxy --url https://api-us-east-1.fieldproxy.ai/mcp --bearer-token-env-var FIELDPROXY_MCP_KEY
```

To sign in instead of using a key, add the server without `--bearer-token-env-var`, then run `codex mcp login fieldproxy`.

Stdio bridge:

```bash
FIELDPROXY_MCP_URL=https://api-us-east-1.fieldproxy.ai/mcp \
FIELDPROXY_MCP_KEY=fpmcp.YOUR_KEY \
npx -y @fieldproxy/mcp
```

The bridge sends a key; for OAuth over stdio use `npx -y mcp-remote <address>` without a header and it opens the sign-in page.

Config files for each client are in [`examples/`](examples):

| File | Client |
|---|---|
| [`claude-code.sh`](examples/claude-code.sh) | Claude Code |
| [`claude_desktop_config.json`](examples/claude_desktop_config.json) | Claude Desktop (stdio via mcp-remote) |
| [`cursor-mcp.json`](examples/cursor-mcp.json) | Cursor, `.mcp.json` |
| [`vscode-mcp.json`](examples/vscode-mcp.json) | GitHub Copilot in VS Code (`.vscode/mcp.json`) |
| [`codex-config.toml`](examples/codex-config.toml) | OpenAI Codex (`~/.codex/config.toml`) |
| [`run_sql.mjs`](examples/run_sql.mjs) | Node.js script |
| [`run_sql.py`](examples/run_sql.py) | Python script |

### Scopes

| Scope | Requires | Unlocks |
|---|---|---|
| `data:read` | AI assistant access on for the workspace, and the user has Command Center access | Schema, ready-made reports, read-only SQL |
| `data:write` | Tables the workspace lets the AI write, and no approval gate on them | Changes to records, confirmed by a person and undoable; email and SMS drafts, sent on confirm |
| `build` | An administrator, plus Allow build switched on for the workspace | Fields, tables, screens, automations, voice and text agents, sandbox copies |

The user's own Command Center access sets the ceiling. A key can be limited further.

## Security model

- **Confirm before change.** Every write, send or action is a proposal a person confirms within 30 minutes. Writes can be undone. More than 5 rows needs bulk permission, and more than 1,000 is refused.
- **Scoped keys.** Limit a key to certain tables, certain rows ("only the North region's jobs"), hidden columns, insert/update/delete, and an expiry from 1 hour to 90 days. Postgres enforces the row limits, and hidden columns are removed from every result.
- **A tool list built per person.** The tools the AI sees are assembled for each request from the key's scopes, the person's role, the workspace settings and the key's limits. A tool missing from the list is refused even when called by name.
- **Revocation on the next call.** Nothing is kept between requests. Each one is authorised from scratch, so a revoked or expired key is refused at once.
- **Audit.** Every call is logged with the tool, key, person and outcome. Administrators see every key and connected app and can revoke any of them.
- **Sends are limited.** Email goes only from the user's own mailbox, at most 20 sends an hour per key, inside the workspace's quiet hours. A sandbox copy never sends.
- **Builds are drafts.** Publishing is blocked if the linter, a SQL check or a navigation check finds a new error. Every version is kept for rollback.

## The stdio bridge (`@fieldproxy/mcp`)

[`bin/fieldproxy-mcp.js`](bin/fieldproxy-mcp.js) is a small bridge with no dependencies (Node.js 18+). It reads MCP messages on stdin, posts each one to the server, and writes the replies to stdout.

```
npx -y @fieldproxy/mcp --help

  --url <url>       MCP address (env FIELDPROXY_MCP_URL)
  --key <key>       fpmcp.… key (env FIELDPROXY_MCP_KEY)
  --header "N: v"   extra HTTP header, repeatable
  --sandbox         force the public sandbox
```

`npm test` starts the bridge and runs `initialize`, `tools/list` and one `run_sql` against the sandbox.

## Links

- Overview: https://www.fieldproxy.ai/mcp
- Developer docs: https://www.fieldproxy.ai/developers
- Sandbox: https://www.fieldproxy.ai/developers/sandbox
- Which field service software has an MCP server: https://www.fieldproxy.ai/mcp#which-fsm-has-mcp
- MCP Registry entry: `io.github.Fieldproxy/fieldproxy-mcp`
- Book a demo: https://www.fieldproxy.ai/book-demo?source=github-mcp
