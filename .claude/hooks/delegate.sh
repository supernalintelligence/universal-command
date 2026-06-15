#!/usr/bin/env bash
# Generic hook delegation script.
# Reads claude_hooks.parent_repo from supernal.yaml, delegates to parent's hook.
# Usage (from settings.json): $CLAUDE_PROJECT_DIR/.claude/hooks/delegate.sh <hook-name> [args...]

set -euo pipefail
HOOK_NAME="${1:?Usage: delegate.sh <hook-script-name> [args...]}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# .claude/hooks/ → .claude/ → <submodule-root>/
SUBMODULE_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
YAML_FILE="$SUBMODULE_ROOT/supernal.yaml"

# Read claude_hooks.parent_repo — pure grep/sed, no external yaml parser
PARENT_REL=$(grep -A20 '^claude_hooks:' "$YAML_FILE" 2>/dev/null \
  | grep -E '^\s+parent_repo:' \
  | head -1 \
  | sed -E 's/.*parent_repo:[[:space:]]*//; s/[[:space:]#].*//')

if [[ -z "$PARENT_REL" ]]; then
  echo '{"systemMessage":"[delegate] hook skipped: claude_hooks.parent_repo not set in supernal.yaml — branch will NOT be auto-merged. Fix: add claude_hooks.parent_repo to supernal.yaml."}'
  exit 0
fi

if ! PARENT_ROOT="$(cd "$SUBMODULE_ROOT/$PARENT_REL" && pwd 2>/dev/null)"; then
  echo "{\"systemMessage\":\"[delegate] hook skipped: cannot resolve parent_repo path $SUBMODULE_ROOT/$PARENT_REL — branch will NOT be auto-merged.\"}"
  exit 0
fi

TARGET="$PARENT_ROOT/.claude/$HOOK_NAME"

if [[ ! -f "$TARGET" ]]; then
  echo "{\"systemMessage\":\"[delegate] hook skipped: parent hook not found at $TARGET — branch will NOT be auto-merged.\"}"
  exit 0
fi

# Pass SC_DELEGATE_PARENT_ROOT so post-agent-review-merge.sh knows
# it's running from a submodule context.
export SC_DELEGATE_PARENT_ROOT="$PARENT_ROOT"
exec "$TARGET" "${@:2}"
