# SC CLI Migration: Priority-Based Execution Plan

**Generated**: 2026-01-16
**Status**: Ready to Execute
**Approach**: High-importance commands first, validate functionality before proceeding

---

## Migration Philosophy

**Validate High-Value Commands First**
- Migrate most-used commands early to prove system works
- Test in production-like scenarios before continuing
- Build confidence before tackling complex consolidations

---

## Command Priority Classification

### 🔴 **P0: Critical Daily-Use Commands** (Must work perfectly)
Commands used multiple times per day in normal development workflow.

### 🟠 **P1: Important Regular Commands** (Should work well)
Commands used regularly (daily/weekly) but not constantly.

### 🟡 **P2: Useful Occasional Commands** (Can have minor issues)
Commands used occasionally, nice to have.

### ⚪ **P3: Rare/Utility Commands** (Can defer)
Commands rarely used, can migrate later.

---

## Prioritized Migration Order

### **Phase 1: Core Validation** (Week 1)

Migrate highest-priority commands to validate the system works.

#### 🔴 P0-1: `sc git` (Core Git Operations)
**Why first**: Most frequently used, validates complex subprocess handling
**Risk**: High usage = high impact if broken
**Files**: 28 files → ~10 commands
**Time**: 3 days

**Commands**:
1. ✅ `sc git commit` - **CRITICAL** (used multiple times daily) - **COMPLETED** ✅
2. ✅ `sc git merge` - **CRITICAL** (daily) - **COMPLETED** ✅
3. ✅ `sc git push` - **HIGH** - **COMPLETED** ✅
4. ✅ `sc git branch` - **HIGH** - **COMPLETED** ✅
5. ✅ `sc git check` - **HIGH** - **COMPLETED** ✅

**Migration Status**: ✅ **ALL 5 COMMANDS COMPLETE**

- ✅ **git commit**: Migrated & tested (11/11 unit + 7/7 integration tests)
  - Files: `src/commands/git/commit.ts`, `commit-handler.ts`
  - Tests: `__tests__/commit.test.ts`, `commit.integration.test.ts`
  - P0 Features: Subcommand trees, positional args (variadic), lazy loading, streaming

- ✅ **git merge**: Migrated & tested (10/10 tests)
  - Files: `src/commands/git/merge.ts`, `merge-handler.ts`
  - Tests: `__tests__/merge.test.ts`
  - P0 Features: Subcommand trees, positional args (optional), lazy loading
  - Aliases: push/autoPush, delete/deleteLocal, i/interactive, q/quiet

- ✅ **git push**: Migrated & tested (8/8 tests)
  - Files: `src/commands/git/push.ts`, `push-handler.ts`
  - Tests: `__tests__/push.test.ts`
  - P0 Features: Subcommand trees, lazy loading

- ✅ **git branch**: Migrated & tested (10/10 tests)
  - Files: `src/commands/git/branch.ts`, `branch-handler.ts`
  - Tests: `__tests__/branch.test.ts`
  - P0 Features: Subcommand trees, positional args (optional), lazy loading

- ✅ **git check**: Migrated & tested (8/8 tests)
  - Files: `src/commands/git/check.ts`, `check-handler.ts`
  - Tests: `__tests__/check.test.ts`
  - P0 Features: Subcommand trees, lazy loading

- ✅ **Tree Integration**: All 5 commands properly nest (7/7 tests)

**Validation Criteria**:
- [x] `git commit` works (12 flags, variadic positional args, MCP interface)
- [x] `git merge` works (10 flags with aliases, safe merge workflow)
- [x] `git push` works (auto-push with safety checks)
- [x] `git branch` works (session management, optional positional)
- [x] `git check` works (repository health checks)
- [x] All core git operations work (5/5 complete)
- [ ] Performance meets targets (9x improvement) - **READY TO MEASURE**
- [ ] No regressions in daily workflow - **READY TO TEST**
- [ ] **GATE**: Must pass before continuing to Phase 2

---

#### 🔴 P0-2: `sc planning req` (Requirements)
**Why second**: Core workflow command, validates schema parsing
**Risk**: Medium usage, critical for feature development
**Files**: Part of 38-file planning consolidation
**Time**: 1 day

**Commands**:
1. ✅ `sc planning req new` - **CRITICAL**
2. ✅ `sc planning req list` - **HIGH**
3. ✅ `sc planning req show` - **HIGH**
4. ✅ `sc planning req validate` - **HIGH**
5. ✅ `sc planning req generate-tests` - **HIGH**

**Validation Criteria**:
- [ ] Requirements can be created and validated
- [ ] Tests can be generated
- [ ] No workflow disruption
- [ ] **GATE**: Must pass before continuing

---

#### 🟠 P1-3: `sc test` (Testing)
**Why third**: Validates streaming output, subprocess handling
**Risk**: Medium usage, but critical for quality
**Files**: Single command with subprocesses
**Time**: 0.5 days

**Commands**:
1. ✅ `sc test` - **HIGH**
2. ✅ `sc test audit` - **MEDIUM**

**Validation Criteria**:
- [ ] Test execution works
- [ ] Streaming output functional
- [ ] Audit linkage correct

---

**Phase 1 Review**:
- [ ] **All P0 commands working**
- [ ] **Daily workflow unaffected**
- [ ] **Performance targets met**
- [ ] **Team confidence high**

**Decision Point**: If Phase 1 successful → Continue. If issues → Fix before Phase 2.

---

### **Phase 2: Daily-Use Commands** (Week 2)

Migrate remaining high-frequency commands.

#### 🟠 P1-4: `sc workflow wip` (WIP Registry)
**Why**: Used daily for multi-agent coordination
**Files**: Part of workflow commands
**Time**: 1 day

**Commands**:
1. ✅ `sc workflow wip register` - **HIGH**
2. ✅ `sc workflow wip unregister` - **MEDIUM**
3. ✅ `sc workflow wip list` - **MEDIUM**
4. ✅ `sc workflow wip cleanup` - **MEDIUM**

---

#### 🟠 P1-5: `sc health` (Health Checks)
**Why**: Read-only, good for building confidence
**Files**: 5 subcommands
**Time**: 1 day

**Commands**:
1. ✅ `sc health` - **MEDIUM**
2. ✅ `sc health context` - **MEDIUM**
3. ✅ `sc health check` - **MEDIUM**

---

#### 🟠 P1-6: `sc docs` (Documentation)
**Why**: Used regularly for doc maintenance
**Files**: 4 subcommands with file writes
**Time**: 1 day

**Commands**:
1. ✅ `sc docs links` - **HIGH**
2. ✅ `sc docs validate` - **MEDIUM**
3. ✅ `sc docs process` - **MEDIUM**
4. ✅ `sc docs generate` - **LOW**

---

**Phase 2 Review**:
- [ ] All daily-use commands migrated
- [ ] No workflow regressions
- [ ] Performance stable
- [ ] Team using new commands successfully

---

### **Phase 3: Regular Commands** (Week 3)

Migrate less-frequent but important commands.

#### 🟡 P2-7: `sc git worktree` (Worktree Management)
**Why**: Multi-agent workflow support
**Files**: Part of git consolidation
**Time**: 1 day

**Commands**:
1. ✅ `sc git worktree add`
2. ✅ `sc git worktree remove`
3. ✅ `sc git worktree merge`
4. ✅ `sc git worktree list`

---

#### 🟡 P2-8: `sc git hooks` (Git Hooks)
**Why**: Setup/maintenance, not daily use
**Files**: Part of git consolidation
**Time**: 0.5 days

**Commands**:
1. ✅ `sc git hooks install`
2. ✅ `sc git hooks run`
3. ✅ `sc git hooks config`

---

#### 🟡 P2-9: `sc audit` (Code Quality)
**Why**: Regular quality checks
**Files**: 3 subcommands
**Time**: 1 day

**Commands**:
1. ✅ `sc audit skipped-tests`
2. ✅ `sc audit rules`
3. ✅ `sc audit all`

---

#### 🟡 P2-10: `sc traceability` (Traceability)
**Why**: Compliance/quality
**Files**: 3 subcommands
**Time**: 1 day

**Commands**:
1. ✅ `sc traceability show`
2. ✅ `sc traceability validate`
3. ✅ `sc traceability map`

---

**Phase 3 Review**:
- [ ] Regular commands migrated
- [ ] Multi-agent workflows stable
- [ ] Quality tooling functional

---

### **Phase 4: Occasional Commands** (Week 4)

Migrate less-critical commands and complete consolidations.

#### 🟡 P2-11: `sc planning` (Remaining Planning)
**Why**: Complete planning consolidation
**Files**: Remaining planning commands
**Time**: 2 days

**Commands**:
1. ✅ `sc planning epic new`
2. ✅ `sc planning epic list`
3. ✅ `sc planning epic show`
4. ✅ `sc planning feature new`
5. ✅ `sc planning feature list`
6. ✅ `sc planning feature show`

---

#### ⚪ P3-12: `sc init` (Project Init)
**Why**: One-time setup command
**Files**: Single command with prompts
**Time**: 1 day

---

#### ⚪ P3-13: `sc build` / `sc validation` (Build Tools)
**Why**: Less frequently used
**Files**: 2-3 commands
**Time**: 1 day

---

#### ⚪ P3-14: Remaining Low-Priority
**Why**: Rarely used utilities
**Time**: 1-2 days

**Commands**:
- `sc search`
- `sc rules export`
- `sc git deploy`
- `sc git smart`
- Other utilities

---

**Phase 4 Review**:
- [ ] All planned commands migrated
- [ ] Consolidations complete
- [ ] File count reduced significantly

---

## Success Gates

### Gate 1: After Phase 1 (Week 1)
**REQUIRED TO CONTINUE**:
- ✅ `sc git commit`, `sc git merge` working perfectly
- ✅ `sc planning req` working
- ✅ `sc test` functional
- ✅ No daily workflow disruption
- ✅ Team can use migrated commands

**If ANY fail**: Stop, fix issues, re-validate before Phase 2

---

### Gate 2: After Phase 2 (Week 2)
**REQUIRED TO CONTINUE**:
- ✅ All P0/P1 commands stable
- ✅ Daily development workflow smooth
- ✅ Performance targets met
- ✅ Test coverage >90% for migrated

---

### Gate 3: After Phase 3 (Week 3)
**REQUIRED TO CONTINUE**:
- ✅ Multi-agent workflows stable
- ✅ Quality tooling functional
- ✅ No major regressions

---

## Risk Mitigation

### High-Risk Commands (Migrate Carefully)

1. **`sc git commit`**
   - **Risk**: Used constantly, any bug blocks work
   - **Mitigation**: Side-by-side testing, gradual rollout
   - **Rollback**: Keep legacy version available for 1 week

2. **`sc planning req`**
   - **Risk**: Breaks requirement workflow
   - **Mitigation**: Extensive validation tests
   - **Rollback**: Legacy version on standby

3. **`sc test`**
   - **Risk**: Breaks testing workflow
   - **Mitigation**: Test with multiple test suites
   - **Rollback**: Easy revert

---

## Performance Benchmarks

| Command | Before | Target | Phase |
|---------|--------|--------|-------|
| `sc git --help` | 450ms | <100ms | Phase 1 |
| `sc git commit` | - | <50ms overhead | Phase 1 |
| `sc planning req list` | - | <100ms | Phase 1 |
| `sc test` (startup) | - | <100ms | Phase 1 |
| Overall CLI startup | 450ms | <100ms | Phase 4 |

---

## Validation Checklist (Per Command)

For EACH migrated command:

### Functional Validation
- [ ] Command executes without errors
- [ ] Output matches legacy format (or documented differences)
- [ ] All flags/options work correctly
- [ ] Subcommands work correctly
- [ ] Error handling matches expectations

### Performance Validation
- [ ] Lazy loading confirmed (handler not loaded until execution)
- [ ] Startup time meets target
- [ ] Memory usage acceptable
- [ ] No performance regression vs legacy

### Integration Validation
- [ ] Works in actual development workflow
- [ ] Integrates with other commands
- [ ] WIP registry tracking works (if applicable)
- [ ] Git hooks work (if applicable)

### Test Validation
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Compatibility tests pass (vs legacy)
- [ ] Edge cases covered

---

## Timeline Summary

| Phase | Week | Focus | Commands | Gate Required |
|-------|------|-------|----------|---------------|
| **1** | 1 | Core validation | 3 command groups (git, planning req, test) | ✅ Yes |
| **2** | 2 | Daily-use | 3 command groups (wip, health, docs) | ✅ Yes |
| **3** | 3 | Regular | 4 command groups (worktree, hooks, audit, trace) | ✅ Yes |
| **4** | 4 | Occasional | Remaining commands | No |

---

## Next Actions

### Immediate (Before Starting)
1. [ ] Review this plan with team
2. [ ] Get approval on priority order
3. [ ] Set up test infrastructure
4. [ ] Create backup/rollback plan
5. [ ] Schedule Phase 1 kickoff

### Week 1 (Phase 1 - CRITICAL)
1. [ ] Start with `sc git commit`
2. [ ] Validate `sc git merge`
3. [ ] Migrate `sc planning req`
4. [ ] Migrate `sc test`
5. [ ] **GATE 1 REVIEW** - Go/No-Go decision

### Week 2 (Phase 2)
- Only proceed if Gate 1 passes

### Week 3 (Phase 3)
- Only proceed if Gate 2 passes

### Week 4 (Phase 4)
- Only proceed if Gate 3 passes

---

## Rollback Plan

### If Phase 1 Fails
- **Immediate**: Revert to legacy commands
- **Impact**: Minimal (only 3 command groups affected)
- **Recovery**: 1-2 days to debug and retry

### If Later Phases Fail
- **Option 1**: Keep successful migrations, fix failing ones
- **Option 2**: Complete rollback if systemic issues found
- **Decision**: Based on failure scope

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **P0 Commands Working** | 100% | Gate 1 |
| **Daily Workflow Smooth** | 100% | Team feedback |
| **Performance Target** | <100ms startup | Benchmarks |
| **Test Coverage** | >90% | Test suite |
| **File Reduction** | 45% (111→60) | File count |
| **Zero Regressions** | 100% | Compatibility tests |

---

## Related Documents

- [MIGRATION-CHECKLIST.md](../MIGRATION-CHECKLIST.md) - Detailed per-command checklist
- [MIGRATION-HANDOFF-GUIDE.md](MIGRATION-HANDOFF-GUIDE.md) - Step-by-step how-to
- [cli-migration-backlog.md](cli-migration-backlog.md) - P0/P1 requirements

---

**Status**: Ready to Begin
**First Command**: `sc git commit` (P0-1, most critical)
**First Validation**: Week 1 Gate 1 (must pass to continue)
