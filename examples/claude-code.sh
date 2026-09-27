#!/bin/sh
# Add Fieldproxy to Claude Code. Replace the region and key.
claude mcp add --transport http fieldproxy https://api-us-east-1.fieldproxy.ai/mcp \
  --header "Authorization: Bearer fpmcp.YOUR_KEY"
