#!/usr/bin/env node
// Fieldproxy MCP stdio bridge.
//
// Reads MCP JSON-RPC messages (one per line) on stdin, forwards each to a
// Fieldproxy MCP server over streamable HTTP, and writes every reply to stdout.
// Use it with MCP clients that only start local (stdio) servers.
//
// With no settings it connects to the public read-only sandbox (a sample HVAC
// company with made-up data). For your own workspace set FIELDPROXY_MCP_URL and
// FIELDPROXY_MCP_KEY, or pass --url and --key.
//
// No dependencies. Needs Node.js 18 or newer (built-in fetch).

"use strict";

const VERSION = require("../package.json").version;

const SANDBOX_URL = "https://api-uk.fieldproxy.ai/mcp";
// Public key for the read-only sandbox. Not a secret: it is published in the
// README and can only read sample data. Rotated before it expires.
const SANDBOX_KEY = "fpmcp.eleqia.pZWm5OR4qsYqP1Wb0DKsxm9bfs_vdI-DCHL5JJMPlxc";

const HELP = `fieldproxy-mcp ${VERSION}
Stdio bridge to a Fieldproxy MCP server.

Usage:
  npx -y @fieldproxy/mcp                     connect to the public read-only sandbox
  npx -y @fieldproxy/mcp --url <url> --key <fpmcp key>

Options:
  --url <url>          MCP address, e.g. https://api-us-east-1.fieldproxy.ai/mcp
                       (env FIELDPROXY_MCP_URL)
  --key <key>          fpmcp.… key from Settings, AI assistant, New key
                       (env FIELDPROXY_MCP_KEY)
  --header "N: v"      extra HTTP header, repeatable
  --sandbox            force the public sandbox even if env vars are set
  -h, --help           show this help
  -v, --version        show the version

Messages go to stdout; status lines go to stderr.
`;

function parseArgs(argv) {
  const out = { headers: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      if (i + 1 >= argv.length) fail(`${a} needs a value`);
      return argv[++i];
    };
    const eq = a.indexOf("=");
    const flag = a.startsWith("--") && eq > 0 ? a.slice(0, eq) : a;
    const inline = a.startsWith("--") && eq > 0 ? a.slice(eq + 1) : undefined;
    const val = () => (inline !== undefined ? inline : next());
    switch (flag) {
      case "--url": out.url = val(); break;
      case "--key": out.key = val(); break;
      case "--header": {
        const h = val();
        const c = h.indexOf(":");
        if (c < 1) fail(`--header must look like "Name: value", got ${h}`);
        out.headers[h.slice(0, c).trim()] = h.slice(c + 1).trim();
        break;
      }
      case "--sandbox": out.sandbox = true; break;
      case "-h": case "--help": process.stdout.write(HELP); process.exit(0);
      case "-v": case "--version": process.stdout.write(VERSION + "\n"); process.exit(0);
      default: fail(`unknown option ${a} (see --help)`);
    }
  }
  return out;
}

function fail(msg) {
  process.stderr.write(`fieldproxy-mcp: ${msg}\n`);
  process.exit(2);
}

function log(msg) {
  process.stderr.write(`fieldproxy-mcp: ${msg}\n`);
}

if (typeof fetch !== "function") fail("Node.js 18 or newer is required");

const opts = parseArgs(process.argv.slice(2));
const envUrl = process.env.FIELDPROXY_MCP_URL;
const envKey = process.env.FIELDPROXY_MCP_KEY;
const useSandbox = opts.sandbox || (!opts.url && !envUrl);
const url = useSandbox ? SANDBOX_URL : opts.url || envUrl;
const key = useSandbox ? (opts.key || envKey || SANDBOX_KEY) : opts.key || envKey;

try { new URL(url); } catch { fail(`not a valid URL: ${url}`); }

const baseHeaders = {
  "content-type": "application/json",
  accept: "application/json, text/event-stream",
  "user-agent": `fieldproxy-mcp-bridge/${VERSION} node/${process.versions.node}`,
  ...opts.headers,
};
if (key && !Object.keys(baseHeaders).some((h) => h.toLowerCase() === "authorization")) {
  baseHeaders.authorization = `Bearer ${key}`;
}

log(useSandbox
  ? `connecting to the public read-only sandbox (${url})`
  : `connecting to ${url}${key ? "" : " without a key"}`);
if (!useSandbox && !key && !opts.headers.Authorization) {
  log("no key set: the server will ask for sign-in, which this bridge cannot do. Set FIELDPROXY_MCP_KEY, or use `npx mcp-remote <url>` for OAuth.");
}

let sessionId = null;
let protocolVersion = null;
let initDone = null; // promise that resolves once initialize has answered
let pending = 0;
let stdinClosed = false;

function write(msg) {
  process.stdout.write(JSON.stringify(msg) + "\n");
}

function errorReply(id, code, message) {
  if (id === undefined || id === null) return;
  write({ jsonrpc: "2.0", id, error: { code, message } });
}

function emit(msg) {
  if (msg && msg.result && msg.result.protocolVersion && !protocolVersion) {
    protocolVersion = msg.result.protocolVersion;
  }
  write(msg);
}

async function readSse(res) {
  const decoder = new TextDecoder();
  let buf = "";
  let data = [];
  const flush = () => {
    if (!data.length) return;
    const text = data.join("\n");
    data = [];
    try { emit(JSON.parse(text)); } catch { log("skipped an event that was not JSON"); }
  };
  for await (const chunk of res.body) {
    buf += decoder.decode(chunk, { stream: true });
    let nl;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).replace(/\r$/, "");
      buf = buf.slice(nl + 1);
      if (line === "") flush();
      else if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
    }
  }
  if (buf.startsWith("data:")) data.push(buf.slice(5).replace(/^ /, ""));
  flush();
}

async function forward(msg) {
  const id = msg && msg.id;
  const headers = { ...baseHeaders };
  if (sessionId) headers["mcp-session-id"] = sessionId;
  if (protocolVersion) headers["mcp-protocol-version"] = protocolVersion;
  let res;
  try {
    res = await fetch(url, { method: "POST", headers, body: JSON.stringify(msg) });
  } catch (e) {
    log(`network error: ${e.message}`);
    return errorReply(id, -32000, `Could not reach ${url}: ${e.message}`);
  }
  const sid = res.headers.get("mcp-session-id");
  if (sid) sessionId = sid;
  if (res.status === 202 || res.status === 204) return;
  const type = (res.headers.get("content-type") || "").toLowerCase();
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    let detail = body.slice(0, 300);
    try { const j = JSON.parse(body); if (j.error) detail = typeof j.error === "string" ? j.error : j.error.message || detail; } catch {}
    if (res.status === 401) log("the server refused the key (401). Check FIELDPROXY_MCP_KEY and that the key has not expired or been revoked.");
    // A JSON-RPC error body is still a valid reply; pass it through.
    try { const j = JSON.parse(body); if (j && j.jsonrpc) return emit(j); } catch {}
    return errorReply(id, -32000, `HTTP ${res.status} from ${url}: ${detail}`);
  }
  if (type.includes("text/event-stream")) return readSse(res);
  const text = await res.text();
  if (!text.trim()) return;
  let body;
  try { body = JSON.parse(text); } catch { return errorReply(id, -32700, "Server sent a reply that was not JSON"); }
  (Array.isArray(body) ? body : [body]).forEach(emit);
}

async function handle(line) {
  let msg;
  try { msg = JSON.parse(line); } catch { return write({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }); }
  const isInit = msg && msg.method === "initialize";
  if (isInit) {
    initDone = forward(msg);
    return initDone;
  }
  if (initDone) await initDone.catch(() => {});
  return forward(msg);
}

function track(p) {
  pending++;
  p.catch((e) => log(`error: ${e && e.message}`)).finally(() => {
    pending--;
    if (stdinClosed && pending === 0) process.exit(0);
  });
}

let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  let nl;
  while ((nl = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, nl).trim();
    buffer = buffer.slice(nl + 1);
    if (line) track(handle(line));
  }
});
process.stdin.on("end", () => {
  if (buffer.trim()) track(handle(buffer.trim()));
  stdinClosed = true;
  if (pending === 0) process.exit(0);
});
process.stdout.on("error", () => process.exit(0));
