#!/bin/sh
# Ensure the shared-checkout corruption guard is actually invoked by git.
#
# WHY: core.hooksPath=.husky/_ (husky v9). Git invokes .husky/_/<hookname>, which
# dispatches to the user hook .husky/<hookname> via the husky `h` script. But husky
# only generates stubs for its built-in hook list — `reference-transaction` is NOT in
# it — and .husky/_ is gitignored + regenerated on every install. So without this,
# the committed guard .husky/reference-transaction is never called and corruption
# (HEAD->main, fixture commits onto the dev branch) silently re-enabled.
#
# This recreates the .husky/_/reference-transaction dispatcher stub after husky runs.
# Idempotent and fail-safe (never breaks install). Wired into package.json "prepare".
set -e
hd=".husky/_"
[ -d "$hd" ] || exit 0
if [ -f "$hd/pre-commit" ]; then
  cp "$hd/pre-commit" "$hd/reference-transaction"
else
  printf '#!/usr/bin/env sh\n. "$(dirname "$0")/h"\n' > "$hd/reference-transaction"
fi
chmod +x "$hd/reference-transaction" 2>/dev/null || true
chmod +x .husky/reference-transaction 2>/dev/null || true
echo "✅ ref-guard hook stub ensured (.husky/_/reference-transaction -> .husky/reference-transaction)"
