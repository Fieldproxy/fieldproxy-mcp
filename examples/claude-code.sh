#!/bin/sh
# Add Fieldproxy to Claude Code.

# 1. The public read-only sandbox (sample HVAC company, made-up data):
claude mcp add --transport http fieldproxy-sandbox https://api-uk.fieldproxy.ai/mcp \
  --header "Authorization: Bearer fpmcp.eleqia.pZWm5OR4qsYqP1Wb0DKsxm9bfs_vdI-DCHL5JJMPlxc"

# 2. Your own workspace. Use your region's address and a key from
#    Settings, AI assistant, New key:
# claude mcp add --transport http fieldproxy https://api-us-east-1.fieldproxy.ai/mcp \
#   --header "Authorization: Bearer fpmcp.YOUR_KEY"
