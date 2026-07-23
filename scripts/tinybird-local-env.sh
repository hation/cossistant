#!/bin/sh

set -eu

if ! command -v tb >/dev/null 2>&1; then
	echo "tb CLI is required" >&2
	exit 1
fi

STATUS_OUTPUT="$(tb local status)"
WORKSPACE_TOKEN="$(printf '%s\n' "$STATUS_OUTPUT" | sed -n 's/^token: //p' | head -n 1)"
WORKSPACE_ID="$(printf '%s\n' "$STATUS_OUTPUT" | sed -n 's/^workspace_id: //p' | head -n 1)"

if [ -z "$WORKSPACE_TOKEN" ] || [ -z "$WORKSPACE_ID" ]; then
	echo "Could not parse tb local status output" >&2
	exit 1
fi

printf 'TINYBIRD_TOKEN="%s"\n' "$WORKSPACE_TOKEN"
printf 'TINYBIRD_SIGNING_KEY="%s"\n' "$WORKSPACE_TOKEN"
printf 'TINYBIRD_WORKSPACE="%s"\n' "$WORKSPACE_ID"
