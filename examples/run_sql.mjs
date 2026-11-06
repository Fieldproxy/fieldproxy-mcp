#!/usr/bin/env node
// Call Fieldproxy's run_sql tool over MCP (JSON-RPC over HTTP) and print the rows.
// Needs Node.js 18+. No packages.
//
//   node run_sql.mjs
//   node run_sql.mjs "SELECT name, city FROM st_customers LIMIT 5"
//
// Defaults to the public read-only sandbox. For your own workspace set
// FIELDPROXY_MCP_URL and FIELDPROXY_MCP_KEY.

const url = process.env.FIELDPROXY_MCP_URL || "https://api-uk.fieldproxy.ai/mcp";
const key = process.env.FIELDPROXY_MCP_KEY || "fpmcp.eleqia.pZWm5OR4qsYqP1Wb0DKsxm9bfs_vdI-DCHL5JJMPlxc";
const sql = process.argv[2] ||
  "SELECT jt.name AS job_type, count(*) AS jobs FROM st_jobs j JOIN st_job_types jt ON jt.id = j.job_type_id GROUP BY jt.name ORDER BY jobs DESC LIMIT 5";

let nextId = 1;
let sessionId;

async function rpc(method, params) {
  const headers = {
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
    authorization: `Bearer ${key}`,
  };
  if (sessionId) headers["mcp-session-id"] = sessionId;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", id: nextId++, method, params }),
  });
  sessionId = res.headers.get("mcp-session-id") || sessionId;
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
  // The server may answer as plain JSON or as a server-sent event stream.
  const body = (res.headers.get("content-type") || "").includes("text/event-stream")
    ? JSON.parse(text.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5)).join(""))
    : JSON.parse(text);
  if (body.error) throw new Error(body.error.message);
  return body.result;
}

const init = await rpc("initialize", {
  protocolVersion: "2025-06-18",
  capabilities: {},
  clientInfo: { name: "fieldproxy-example-node", version: "1.0.0" },
});
console.log(`Connected to ${init.serverInfo.name} ${init.serverInfo.version}`);

const result = await rpc("tools/call", { name: "run_sql", arguments: { sql } });
const text = result.content.map((c) => c.text).join("\n");
if (result.isError) {
  console.error("run_sql refused:", text);
  process.exit(1);
}
const { rows, row_count } = JSON.parse(text);
console.log(`SQL: ${sql}`);
console.table(rows);
console.log(`${row_count} row(s)`);
