#!/usr/bin/env python3
"""Call Fieldproxy's run_sql tool over MCP (JSON-RPC over HTTP) and print the rows.

Needs Python 3.8+. Standard library only.

    python3 run_sql.py
    python3 run_sql.py "SELECT name, city FROM st_customers LIMIT 5"

Defaults to the public read-only sandbox. For your own workspace set
FIELDPROXY_MCP_URL and FIELDPROXY_MCP_KEY.
"""
import json
import os
import sys
import urllib.error
import urllib.request

URL = os.environ.get("FIELDPROXY_MCP_URL", "https://api-uk.fieldproxy.ai/mcp")
KEY = os.environ.get("FIELDPROXY_MCP_KEY", "fpmcp.eleqia.pZWm5OR4qsYqP1Wb0DKsxm9bfs_vdI-DCHL5JJMPlxc")
SQL = sys.argv[1] if len(sys.argv) > 1 else (
    "SELECT j.job_number, c.name AS customer, c.city, j.status "
    "FROM st_jobs j JOIN st_customers c ON c.id = j.customer_id "
    "WHERE j.status = 'scheduled' ORDER BY j.created_at DESC LIMIT 5"
)

_next_id = 1
_session_id = None


def rpc(method, params=None):
    global _next_id, _session_id
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
        "Authorization": "Bearer " + KEY,
        "User-Agent": "fieldproxy-example-python/1.0",
    }
    if _session_id:
        headers["Mcp-Session-Id"] = _session_id
    payload = {"jsonrpc": "2.0", "id": _next_id, "method": method}
    if params is not None:
        payload["params"] = params
    _next_id += 1
    req = urllib.request.Request(URL, json.dumps(payload).encode(), headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=60) as res:
            _session_id = res.headers.get("Mcp-Session-Id") or _session_id
            text = res.read().decode()
            ctype = res.headers.get("Content-Type", "")
    except urllib.error.HTTPError as e:
        raise SystemExit("HTTP %s: %s" % (e.code, e.read().decode()[:300]))
    # The server may answer as plain JSON or as a server-sent event stream.
    if "text/event-stream" in ctype:
        text = "".join(l[5:] for l in text.splitlines() if l.startswith("data:"))
    body = json.loads(text)
    if "error" in body:
        raise SystemExit(body["error"]["message"])
    return body["result"]


init = rpc("initialize", {
    "protocolVersion": "2025-06-18",
    "capabilities": {},
    "clientInfo": {"name": "fieldproxy-example-python", "version": "1.0.0"},
})
print("Connected to %s %s" % (init["serverInfo"]["name"], init["serverInfo"]["version"]))

result = rpc("tools/call", {"name": "run_sql", "arguments": {"sql": SQL}})
text = "\n".join(c.get("text", "") for c in result["content"])
if result.get("isError"):
    raise SystemExit("run_sql refused: " + text)

data = json.loads(text)
rows = data["rows"]
print("SQL: " + SQL)
if rows:
    cols = list(rows[0].keys())
    widths = [max(len(c), *(len(str(r.get(c, ""))) for r in rows)) for c in cols]
    print("  ".join(c.ljust(w) for c, w in zip(cols, widths)))
    print("  ".join("-" * w for w in widths))
    for r in rows:
        print("  ".join(str(r.get(c, "")).ljust(w) for c, w in zip(cols, widths)))
print("%d row(s)" % data["row_count"])
