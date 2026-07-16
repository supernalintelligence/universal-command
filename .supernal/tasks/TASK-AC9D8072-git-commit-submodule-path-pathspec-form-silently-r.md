---
id: TASK-AC9D8072
title: "git commit -- <submodule-path> (pathspec form) silently re-derives the gitlink from the submodule's physical checked-out commit, discarding whatever was staged via git update-index --cacheinfo -- hit independently by at least 3 sessions tonight, each producing a wrong commit requiring a follow-up correction. Needs either a canonical helper (sc git submodule bump already exists and is documented as trivial/safe -- audit whether it's actually being used everywhere pins get bumped, or whether sessions keep hand-rolling git commit -- <path> instead) or a pre-commit guard that detects+blocks this specific footgun before it lands a wrong pin."
status: todo
priority: P1
created: 2026-07-16
origin:
  source: 'cli:agent'
  session_id: '8e0bb62c-1c5f-432a-9a68-fdbab1013165'
token_estimate:
  model: 'claude-sonnet-4-6'
  input_k: 30
  output_k: 10
  cost_usd: 0.24
  wall_clock_min: 20
  basis: 'default'
---

## Description

[Add description here]

## Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2

## Cost Estimate

> Effort: unknown effort | Model: claude-sonnet-4-6 | Est: ~$0.24
> Input: ~30k tokens | Output: ~10k tokens | Basis: default
> Wall-clock: ~20 min (4 min Claude + ~16 min tool/eval gaps)
> Adjust if task is unusually context-heavy or output-light.

## Notes
