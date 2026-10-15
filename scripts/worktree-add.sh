#!/usr/bin/env bash
# Creates the worktree `<main checkout>.worktrees/$1` on a new branch `feature/$1` from `origin/main`, ready to run, and opens it in VS Code.
set -euo pipefail

slug=${1:-}
if [ -z "$slug" ]; then read -rp 'Slug: ' slug || true; fi
: "${slug:?usage: npm run worktree:add -- <slug>}"
main=$(cd "$(git rev-parse --git-common-dir)/.." && pwd)
worktree="$main.worktrees/$slug"

git fetch origin main
git worktree add --no-track -b "feature/$slug" "$worktree" origin/main

cd "$worktree"
npm ci
echo "Worktree ready: $worktree"
code "$worktree"
