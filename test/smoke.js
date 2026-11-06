// Starts the bridge, sends initialize + tools/list + one run_sql over stdio,
// and checks the replies. Uses the public sandbox unless FIELDPROXY_MCP_URL is set.
"use strict";
const { spawn } = require("node:child_process");
const path = require("node:path");

const bridge = spawn(process.execPath, [path.join(__dirname, "..", "bin", "fieldproxy-mcp.js")], {
  stdio: ["pipe", "pipe", "inherit"],
});

const replies = new Map();
let buf = "";
bridge.stdout.on("data", (c) => {
  buf += c;
  let nl;
  while ((nl = buf.indexOf("\n")) >= 0) {
    const m = JSON.parse(buf.slice(0, nl));
    buf = buf.slice(nl + 1);
    replies.set(m.id, m);
  }
});

const send = (m) => bridge.stdin.write(JSON.stringify(m) + "\n");
send({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "smoke", version: "1" } } });
send({ jsonrpc: "2.0", method: "notifications/initialized" });
send({ jsonrpc: "2.0", id: 2, method: "tools/list" });
send({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "run_sql", arguments: { sql: "SELECT count(*) AS jobs FROM st_jobs" } } });
bridge.stdin.end();

bridge.on("exit", (code) => {
  const init = replies.get(1), list = replies.get(2), call = replies.get(3);
  const fails = [];
  if (!init || !init.result) fails.push("initialize: " + JSON.stringify(init && init.error));
  if (!list || !list.result || !list.result.tools.length) fails.push("tools/list: " + JSON.stringify(list && list.error));
  if (!call || !call.result || call.result.isError) fails.push("run_sql: " + JSON.stringify(call));
  if (fails.length) { console.error("FAIL\n" + fails.join("\n")); process.exit(1); }
  console.log(`server: ${init.result.serverInfo.name} ${init.result.serverInfo.version}, protocol ${init.result.protocolVersion}`);
  console.log(`tools: ${list.result.tools.length} (${list.result.tools.map((t) => t.name).join(", ")})`);
  console.log(`run_sql: ${call.result.content[0].text.replace(/\s+/g, " ")}`);
  console.log(`bridge exit code: ${code}`);
  console.log("PASS");
});
