# SC CLI Migration Checklist

**Updated**: 2026-01-16
**Status**: Ready to Begin

Track migration progress for each command moving from legacy CLI to universal-command.

---

## Pre-Migration Setup

- [ ] Universal command tests passing (197/197)
- [ ] Package built and published to workspace
- [ ] Test infrastructure created (`tests/integration/cli/universal-command/`)
- [ ] Helper functions created (`cli-runner.ts`, `output-matcher.ts`)
- [ ] Migration guide reviewed by team
- [ ] Week 1 kickoff scheduled

---

## Phase A: Read-Only Commands (Week 1)

**Target**: 4 commands, ~15 files

### `sc health` (Priority 1)

- [ ] **Analyze** - Current implementation reviewed
- [ ] **Schema** - CommandSchema created
  - [ ] Subcommands: `sc health` (default)
  - [ ] Subcommands: `sc health context`
  - [ ] Subcommands: `sc health check`
  - [ ] Subcommands: `sc health status`
  - [ ] Subcommands: `sc health all`
- [ ] **Handler** - Logic migrated from legacy
- [ ] **Tests** - Unit tests written
- [ ] **Tests** - Integration tests written
- [ ] **Tests** - Legacy compatibility verified
- [ ] **Performance** - Lazy loading validated
- [ ] **Register** - Added to CLI program
- [ ] **Cleanup** - Old implementation removed
- [ ] **Commit** - Changes committed
- [ ] **Notes** - Learnings documented

**Estimated Time**: 8 hours (first command, slower)

---

### `sc rules export` (Priority 1)

- [ ] **Analyze**
- [ ] **Schema**
- [ ] **Handler**
- [ ] **Tests** - Unit
- [ ] **Tests** - Integration
- [ ] **Tests** - Compatibility
- [ ] **Performance**
- [ ] **Register**
- [ ] **Cleanup**
- [ ] **Commit**

**Estimated Time**: 6 hours (learning from health)

---

### `sc traceability` (Priority 2)

- [ ] **Analyze**
- [ ] **Schema**
  - [ ] Subcommands: `sc traceability show`
  - [ ] Subcommands: `sc traceability validate`
  - [ ] Subcommands: `sc traceability map`
- [ ] **Handler**
- [ ] **Tests** - Unit
- [ ] **Tests** - Integration
- [ ] **Tests** - Compatibility
- [ ] **Performance**
- [ ] **Register**
- [ ] **Cleanup**
- [ ] **Commit**

**Estimated Time**: 6 hours

---

### `sc search` (Priority 2)

- [ ] **Analyze**
- [ ] **Schema**
- [ ] **Handler**
- [ ] **Tests** - Unit
- [ ] **Tests** - Integration
- [ ] **Tests** - Compatibility
- [ ] **Performance**
- [ ] **Register**
- [ ] **Cleanup**
- [ ] **Commit**

**Estimated Time**: 5 hours

---

**Phase A Total**: ~25 hours (~1 week)

**Phase A Review**:
- [ ] All Phase A tests passing
- [ ] Performance benchmarks met
- [ ] Documentation updated
- [ ] Lessons learned documented for Phase B

---

## Phase B: Non-Interactive Commands (Week 2)

**Target**: 4 command groups, ~20 files

### `sc docs` (Priority 1)

- [ ] **Analyze**
- [ ] **Schema**
  - [ ] Subcommands: `sc docs links`
  - [ ] Subcommands: `sc docs validate`
  - [ ] Subcommands: `sc docs process`
  - [ ] Subcommands: `sc docs generate`
- [ ] **Handler** - With rollback logic
- [ ] **Tests** - Unit (including rollback)
- [ ] **Tests** - Integration
- [ ] **Tests** - File write validation
- [ ] **Performance**
- [ ] **Register**
- [ ] **Cleanup**
- [ ] **Commit**

**Estimated Time**: 7 hours (file writes, rollback)

---

### `sc audit` (Priority 1)

- [ ] **Analyze**
- [ ] **Schema**
  - [ ] Subcommands: `sc audit skipped-tests`
  - [ ] Subcommands: `sc audit rules`
  - [ ] Subcommands: `sc audit all`
- [ ] **Handler**
- [ ] **Tests** - Unit
- [ ] **Tests** - Integration
- [ ] **Tests** - Compatibility
- [ ] **Performance**
- [ ] **Register**
- [ ] **Cleanup**
- [ ] **Commit**

**Estimated Time**: 6 hours

---

### `sc validation` (Priority 2)

- [ ] **Analyze**
- [ ] **Schema**
  - [ ] Subcommands: `sc validation workflow`
  - [ ] Subcommands: `sc validation all`
- [ ] **Handler**
- [ ] **Tests** - Unit
- [ ] **Tests** - Integration
- [ ] **Tests** - Compatibility
- [ ] **Performance**
- [ ] **Register**
- [ ] **Cleanup**
- [ ] **Commit**

**Estimated Time**: 5 hours

---

### `sc build` (Priority 2)

- [ ] **Analyze**
- [ ] **Schema** - With pass-through options
- [ ] **Handler** - Subprocess integration
- [ ] **Tests** - Unit
- [ ] **Tests** - Integration
- [ ] **Tests** - Pass-through validation
- [ ] **Performance**
- [ ] **Register**
- [ ] **Cleanup**
- [ ] **Commit**

**Estimated Time**: 6 hours (subprocess complexity)

---

**Phase B Total**: ~24 hours (~1 week)

**Phase B Review**:
- [ ] All Phase B tests passing
- [ ] Rollback logic tested
- [ ] Subprocess integration working
- [ ] Ready for Phase C (interactive)

---

## Phase C: Interactive Commands (Week 3)

**Target**: 2 command groups, ~10 files

### `sc init` (Priority 1)

- [ ] **Analyze**
- [ ] **Schema** - TTY detection, prompts
- [ ] **Handler** - Interactive + non-interactive modes
- [ ] **Tests** - Interactive (mocked prompts)
- [ ] **Tests** - Non-interactive (flags)
- [ ] **Tests** - TTY detection
- [ ] **Performance**
- [ ] **Register**
- [ ] **Cleanup**
- [ ] **Commit**

**Estimated Time**: 8 hours (complex prompts)

---

### `sc workflow` (Priority 1)

- [ ] **Analyze**
- [ ] **Schema**
  - [ ] Subcommands: `sc workflow wip register`
  - [ ] Subcommands: `sc workflow wip unregister`
  - [ ] Subcommands: `sc workflow wip list`
  - [ ] Subcommands: `sc workflow wip status`
  - [ ] Subcommands: `sc workflow wip cleanup`
  - [ ] Subcommands: `sc workflow wip check`
- [ ] **Handler** - State management
- [ ] **Tests** - Unit
- [ ] **Tests** - Integration
- [ ] **Tests** - State persistence
- [ ] **Performance**
- [ ] **Register**
- [ ] **Cleanup**
- [ ] **Commit**

**Estimated Time**: 10 hours (state management)

---

**Phase C Total**: ~18 hours (~1 week)

**Phase C Review**:
- [ ] All Phase C tests passing
- [ ] Interactive prompts working
- [ ] Non-interactive modes working
- [ ] State management tested
- [ ] Ready for Phase D (complex)

---

## Phase D: Complex Commands (Week 4)

**Target**: 2 mega-consolidations, ~66 files → ~25 commands

### `sc git` (Priority 1)

**Consolidation**: 28 files → 10 commands

#### Core Git Commands

- [ ] **`sc git commit`**
  - [ ] Schema - Positional `<files...>`
  - [ ] Handler
  - [ ] Tests
  - [ ] Register

- [ ] **`sc git push`**
  - [ ] Schema
  - [ ] Handler
  - [ ] Tests
  - [ ] Register

- [ ] **`sc git pull`**
  - [ ] Schema
  - [ ] Handler
  - [ ] Tests
  - [ ] Register

- [ ] **`sc git branch`**
  - [ ] Schema
  - [ ] Handler
  - [ ] Tests
  - [ ] Register

- [ ] **`sc git merge`**
  - [ ] Schema
  - [ ] Handler
  - [ ] Tests
  - [ ] Register

#### Worktree Commands

- [ ] **`sc git worktree add`**
  - [ ] Schema
  - [ ] Handler
  - [ ] Tests
  - [ ] Register

- [ ] **`sc git worktree remove`**
  - [ ] Schema
  - [ ] Handler
  - [ ] Tests
  - [ ] Register

- [ ] **`sc git worktree merge`**
  - [ ] Schema
  - [ ] Handler - Complex merge logic
  - [ ] Tests
  - [ ] Register

- [ ] **`sc git worktree list`**
  - [ ] Schema
  - [ ] Handler
  - [ ] Tests
  - [ ] Register

- [ ] **`sc git worktree check`**
  - [ ] Schema
  - [ ] Handler
  - [ ] Tests
  - [ ] Register

#### Hooks Commands

- [ ] **`sc git hooks install`**
  - [ ] Schema
  - [ ] Handler
  - [ ] Tests
  - [ ] Register

- [ ] **`sc git hooks run`**
  - [ ] Schema
  - [ ] Handler
  - [ ] Tests
  - [ ] Register

- [ ] **`sc git hooks config`**
  - [ ] Schema
  - [ ] Handler
  - [ ] Tests
  - [ ] Register

#### Advanced Commands

- [ ] **`sc git deploy`**
  - [ ] Schema
  - [ ] Handler
  - [ ] Tests
  - [ ] Register

- [ ] **`sc git check`**
  - [ ] Schema
  - [ ] Handler
  - [ ] Tests
  - [ ] Register

- [ ] **`sc git smart`**
  - [ ] Schema
  - [ ] Handler
  - [ ] Tests
  - [ ] Register

- [ ] **`sc git status`**
  - [ ] Schema
  - [ ] Handler
  - [ ] Tests
  - [ ] Register

#### Git Integration

- [ ] **All git commands registered**
- [ ] **Shared validation logic**
- [ ] **Consistent error handling**
- [ ] **Performance validated** (9x improvement)
- [ ] **Old files removed** (28 files)
- [ ] **Committed**

**Estimated Time**: 30 hours (~4 days)

---

### `sc planning` (Priority 1)

**Consolidation**: 38 files → 15 commands

#### Requirement Commands

- [ ] **`sc planning req new`**
- [ ] **`sc planning req list`**
- [ ] **`sc planning req show`**
- [ ] **`sc planning req validate`**
- [ ] **`sc planning req generate-tests`**
- [ ] **`sc planning req update`**

#### Epic Commands

- [ ] **`sc planning epic new`**
- [ ] **`sc planning epic list`**
- [ ] **`sc planning epic show`**

#### Feature Commands

- [ ] **`sc planning feature new`**
- [ ] **`sc planning feature list`**
- [ ] **`sc planning feature show`**
- [ ] **`sc planning feature validate`**

#### Integration

- [ ] **All planning commands registered**
- [ ] **Shared Gherkin validation**
- [ ] **Consistent frontmatter parsing**
- [ ] **Performance validated**
- [ ] **Old files removed** (38 files)
- [ ] **Committed**

**Estimated Time**: 25 hours (~3 days)

---

**Phase D Total**: ~55 hours (~1.5 weeks)

**Phase D Review**:
- [ ] All Phase D tests passing
- [ ] Git consolidation complete (28 → 10)
- [ ] Planning consolidation complete (38 → 15)
- [ ] Performance targets exceeded
- [ ] File count reduced significantly

---

## Final Validation

### Overall Testing

- [ ] **All migrated commands tested**
- [ ] **Full CLI test suite passing**
- [ ] **No regressions from legacy**
- [ ] **Performance benchmarks met**
  - [ ] Startup < 100ms
  - [ ] Memory < 50MB
  - [ ] Help < 50ms
- [ ] **Coverage > 90%**

### Documentation

- [ ] **All commands documented**
- [ ] **Migration guide updated**
- [ ] **Breaking changes documented**
- [ ] **CLI command inventory updated**

### Cleanup

- [ ] **All legacy files removed**
- [ ] **Old tests removed/updated**
- [ ] **Dependencies pruned**
- [ ] **Build validated**

### Release

- [ ] **Version bumped to 1.0.0**
- [ ] **CHANGELOG updated**
- [ ] **Package published**
- [ ] **GitHub release created**
- [ ] **Team notified**

---

## Success Metrics

| Metric | Before | After | Target | Status |
|--------|--------|-------|--------|--------|
| **Total Commands** | ~120 | ~60 | <80 | ⬜ |
| **Total Files** | ~111 | ~60 | <80 | ⬜ |
| **Startup Time** | 450ms | - | <100ms | ⬜ |
| **Memory Usage** | 80MB | - | <50MB | ⬜ |
| **Test Coverage** | - | - | >90% | ⬜ |

---

## Notes & Learnings

### Phase A Learnings

*(Document patterns, gotchas, time estimates accuracy)*

---

### Phase B Learnings

*(Document rollback strategies, file write patterns)*

---

### Phase C Learnings

*(Document interactive patterns, TTY detection)*

---

### Phase D Learnings

*(Document consolidation approach, shared logic patterns)*

---

## Troubleshooting Log

### Common Issues Encountered

*(Add issues as they arise during migration)*

---

## Timeline

| Milestone | Target Date | Actual Date | Status |
|-----------|-------------|-------------|--------|
| **Pre-Migration Setup** | Week 0 | - | ⬜ |
| **Phase A Complete** | Week 1 | - | ⬜ |
| **Phase B Complete** | Week 2 | - | ⬜ |
| **Phase C Complete** | Week 3 | - | ⬜ |
| **Phase D Complete** | Week 4-5 | - | ⬜ |
| **Final Validation** | Week 5 | - | ⬜ |
| **Release** | Week 5 | - | ⬜ |

---

## Sign-off

**Phase A Sign-off**:
- Reviewer: _______________
- Date: _______________
- Notes: _______________

**Phase B Sign-off**:
- Reviewer: _______________
- Date: _______________
- Notes: _______________

**Phase C Sign-off**:
- Reviewer: _______________
- Date: _______________
- Notes: _______________

**Phase D Sign-off**:
- Reviewer: _______________
- Date: _______________
- Notes: _______________

**Final Sign-off**:
- Reviewer: _______________
- Date: _______________
- Notes: _______________

---

**Next Action**: Begin Phase A with `sc health` command migration
