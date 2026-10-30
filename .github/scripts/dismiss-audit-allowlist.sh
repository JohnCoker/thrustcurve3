#!/bin/sh
# Dismiss open Dependabot alerts whose GHSA id is listed in AUDIT.md.
set -eu

root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
cd "$root"

if ! command -v gh >/dev/null 2>&1; then
  echo "gh is required" >&2
  exit 1
fi

allow=$(mktemp)
alerts=$(mktemp)
trap 'rm -f "$allow" "$alerts"' EXIT

grep -oE 'GHSA-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}' AUDIT.md | sort -u >"$allow"
if [ ! -s "$allow" ]; then
  echo "no GHSA ids in AUDIT.md" >&2
  exit 1
fi

repo=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
gh api --paginate "repos/${repo}/dependabot/alerts?state=open&per_page=100" \
  --jq '.[] | select(.state=="open") | [.number, .security_advisory.ghsa_id] | @tsv' \
  >"$alerts"

found=0
while IFS="$(printf '\t')" read -r number ghsa; do
  [ -n "$number" ] || continue
  found=1
  if grep -qx "$ghsa" "$allow"; then
    gh api --method PATCH "repos/${repo}/dependabot/alerts/${number}" \
      -f state=dismissed \
      -f dismissed_reason=not_used \
      -f dismissed_comment="Allowlisted in AUDIT.md. The vulnerable behavior is not reachable in this app." \
      >/dev/null
    echo "dismissed ${number} ${ghsa}"
  else
    echo "left open ${number} ${ghsa}"
  fi
done <"$alerts"

if [ "$found" -eq 0 ]; then
  echo "no open Dependabot alerts"
fi
