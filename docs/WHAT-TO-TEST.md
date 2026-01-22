# What You Should Test - Phase 1-4 Validation

**Created**: 2026-01-17
**Purpose**: Guide for manually testing migrated commands and validating performance

---

## Quick Start

### 1. Performance Benchmark (5 minutes)

Run the automated performance benchmark to validate lazy loading:

```bash
cd packages/universal-command
node scripts/benchmark-lazy-loading.js
```

**What to look for**:
- ✅ Cold start (help commands) should be **<100ms**
- ✅ Single command execution should be **<500ms**
- ✅ No errors during benchmark runs
- ✅ Results saved to `benchmark-results-YYYY-MM-DD.json`

**Expected output**:
```
📊 Test 1: Cold start (help command - no handlers loaded)...
📊 Test 2: Single command execution (one handler)...
📊 Test 3: List commands (minimal loading)...

📈 Results:
┌─────────────────────────────────────────────┬──────────┬──────────┬──────────┬──────────┐
│ Command                                     │ Avg (ms) │ Min (ms) │ Max (ms) │ Med (ms) │
├─────────────────────────────────────────────┼──────────┼──────────┼──────────┼──────────┤
│ Git help (cold start)                       │    89.23 │    82.15 │    98.47 │    87.92 │
│ Planning help (cold start)                  │    91.45 │    85.23 │   102.18 │    90.11 │
│ Agent status (single handler)               │   234.56 │   221.34 │   256.78 │   232.45 │
│ Git check (single handler)                  │   245.67 │   232.45 │   267.89 │   243.21 │
│ Req list (filtered, early exit)             │   312.34 │   298.76 │   334.56 │   310.12 │
└─────────────────────────────────────────────┴──────────┴──────────┴──────────┴──────────┘

💡 Lazy Loading Impact:
   - Help commands should be <100ms (no handler imports)
   - Single command execution adds handler import cost
   - Expected improvement: ~9x for cold start vs eager loading
```

---

### 2. Quick Smoke Tests (10 minutes)

Test the most critical commands to ensure basic functionality:

```bash
# Git commands (30 seconds each)
sc git --help              # Should show help instantly
sc git check               # Should show repo status
sc git branch              # Should list branches

# Planning commands (30 seconds each)
sc planning req list | head -5     # Should list requirements
sc planning --help                 # Should show help

# Agent commands (30 seconds each)
sc agent status                    # Should show current assignment
sc workflow wip list | head -5     # Should list WIP files

# Test commands (1 minute)
sc test --help                     # Should show help
```

**What to look for**:
- ✅ Commands execute without errors
- ✅ Help displays instantly (<100ms)
- ✅ Output formatted correctly
- ✅ No missing dependencies warnings

---

### 3. Full Manual Testing (2-3 hours)

For thorough validation, work through the comprehensive checklist:

**Location**: [packages/universal-command/docs/MANUAL-TESTING-CHECKLIST.md](./MANUAL-TESTING-CHECKLIST.md)

**Recommended approach**:
1. **Test by workflow** (not alphabetically):
   - Start with git workflow (commit, merge, push)
   - Then planning workflow (req new, list, update)
   - Then agent workflow (assign, status, unassign)

2. **Focus on your daily commands first**:
   - Which commands do YOU use most?
   - Test those thoroughly before others

3. **Document issues immediately**:
   - Use the issue template in the checklist
   - Note severity (critical, high, medium, low)

**Time estimates**:
- Git commands (5): 30 minutes
- Planning commands (5): 30 minutes
- Test commands (2): 15 minutes
- Agent commands (3): 20 minutes
- WIP commands (5): 30 minutes
- Feature commands (3): 20 minutes

**Total**: ~2.5 hours for all 23 commands

---

## Priority Testing Order

### Must Test (Critical Workflows)

**1. Git Commit Workflow** (15 minutes)
```bash
# Create test branch
git checkout -b test-migration-validation

# Test basic commit
echo "test" > test-file.txt
sc git commit test-file.txt -m "test: validate migration"

# Test nit detection
sc git commit --nit

# Test dry-run
sc git commit test-file.txt -m "test" --dry-run

# Cleanup
git checkout main
git branch -D test-migration-validation
```

**Critical checks**:
- ✅ Files commit correctly
- ✅ Commit messages preserved
- ✅ Pre-commit hooks run
- ✅ No errors or warnings

---

**2. Planning Requirement Workflow** (15 minutes)
```bash
# List existing requirements
sc planning req list | head -10

# Show a specific requirement
sc planning req show REQ-WORKFLOW-001

# Validate requirements
sc planning req validate --all

# Check performance (should be <2s for 100+ reqs)
time sc planning req list
```

**Critical checks**:
- ✅ List displays correctly
- ✅ Show reveals details
- ✅ Validation works
- ✅ Performance acceptable

---

**3. Agent Assignment Workflow** (10 minutes)
```bash
# Check current status
sc agent status

# Create test worktree
sc agent assign test-feature

# Verify assignment
sc agent status

# Unassign (keep worktree for cleanup)
sc agent unassign --keep

# Manual cleanup
git worktree remove .worktrees/test-feature
```

**Critical checks**:
- ✅ Worktree created
- ✅ Assignment registered
- ✅ Status reflects assignment
- ✅ Cleanup works

---

**4. WIP Registry Workflow** (10 minutes)
```bash
# Check current WIP
sc workflow wip list

# Register a file
sc workflow wip register test-file.txt --feature=test

# Verify registration
sc workflow wip list | grep test-file

# Unregister
sc workflow wip unregister test-file.txt

# Cleanup check
sc workflow wip cleanup --dry-run
```

**Critical checks**:
- ✅ Registration works
- ✅ List shows registered files
- ✅ Unregister removes entry
- ✅ Cleanup detects orphans

---

### Should Test (Important Workflows)

**5. Test Command Workflow** (5 minutes)
```bash
# Run specific test
sc test tests/unit/example.test.js

# Check test evidence
sc test-map

# Verify logs captured
sc logs test --latest
```

---

**6. Feature Management** (10 minutes)
```bash
# Audit features
sc planning feature audit

# Create test feature
sc planning feature create test-feature --domain=test-domain

# Verify creation
ls -la docs/features/test-domain/test-feature

# Cleanup
rm -rf docs/features/test-domain/test-feature
```

---

## Performance Validation

### Startup Time Comparison

**Before Migration** (theoretical baseline from eager loading):
- Command execution: ~900ms (all modules loaded upfront)

**After Migration** (with lazy loading):
- Help commands: <100ms (no handler imports)
- Single command: ~250ms (one handler import)
- **Improvement**: ~9x for help, ~3.6x for execution

**How to verify**:
```bash
# Measure help command (should be fast)
time sc git --help

# Measure command execution
time sc agent status

# Compare to legacy (if available)
time sc-legacy agent status  # If old version available
```

---

## What to Report

### ✅ Success Indicators

- All smoke tests pass without errors
- Performance benchmark shows <100ms for help
- Critical workflows work as expected
- No missing features vs legacy implementation

### ⚠️ Warning Signs

- Commands taking >2s for simple operations
- Errors during execution
- Missing parameters or flags
- Different output format than legacy

### 🚨 Critical Issues

- Commands failing completely
- Data loss or corruption
- Security vulnerabilities
- Breaking changes in behavior

---

## Reporting Template

When you find issues, document them like this:

```markdown
## Issue: [Brief Description]

**Command**: `sc git commit`
**Test Case**: Basic commit with message
**Severity**: High | Medium | Low
**Frequency**: Always | Sometimes | Rare

**Steps to Reproduce**:
1. Run `sc git commit file.txt -m "test"`
2. Observe error

**Expected Behavior**:
File should be committed with message "test"

**Actual Behavior**:
Error: "Cannot find module xyz"

**Impact**:
Blocks commit workflow

**Workaround**:
Use `git commit` directly

**Environment**:
- OS: macOS 14.6.0
- Node: v20.x
- SC Version: [run `sc --version`]
```

---

## Quick Reference

### Performance Benchmark
```bash
node packages/universal-command/scripts/benchmark-lazy-loading.js
```

### Full Test Checklist
```bash
# Open in editor
code packages/universal-command/docs/MANUAL-TESTING-CHECKLIST.md
```

### Report Issues
- Document in MANUAL-TESTING-CHECKLIST.md
- Or create GitHub issue with template above

---

## Timeline

**Phase 1**: Performance Benchmark (5 min)
**Phase 2**: Smoke Tests (10 min)
**Phase 3**: Critical Workflows (50 min)
**Phase 4**: Full Validation (2-3 hours)

**Total**: 3-4 hours for comprehensive validation

---

## Next Steps After Testing

1. **Document Results**:
   - Update MANUAL-TESTING-CHECKLIST.md with findings
   - Note pass/fail for each command

2. **Report Issues**:
   - Critical issues: Block Phase 5 migration
   - Medium issues: Fix before production use
   - Low issues: Track for future improvement

3. **Performance Analysis**:
   - Review benchmark results
   - Compare to expected 9x improvement
   - Identify any performance regressions

4. **Decision Point**:
   - ✅ If all critical tests pass → Proceed to Phase 5
   - ⚠️ If issues found → Fix before continuing
   - 🚨 If critical failures → Investigate before Phase 5

---

**Questions?** See [MIGRATION-STATUS.md](./planning/MIGRATION-STATUS.md) for migration details or [TEST-STRATEGY-COMPARISON.md](./TEST-STRATEGY-COMPARISON.md) for test approach.
