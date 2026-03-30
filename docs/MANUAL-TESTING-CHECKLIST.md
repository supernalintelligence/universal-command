# Manual Testing Checklist - Phase 1-4 Migrated Commands

**Purpose**: Validate that migrated commands work correctly in real-world workflows

**Status**: Ready for testing
**Commands**: 23 migrated commands (P0-P2 priority)

---

## Testing Instructions

For each command:
1. ✅ **Run the command** as documented
2. ✅ **Verify output** matches expected behavior
3. ✅ **Check for errors** or warnings
4. ✅ **Test edge cases** (invalid inputs, missing args, etc.)
5. ✅ **Document any issues** found

---

## Phase 1: Git Commands (P0-1) - 5 commands

### ✅ `sc git commit`

**Test Cases**:
```bash
# 1. Basic commit with message
sc git commit file1.js file2.js -m "test: basic commit"

# 2. Commit with --nit flag (trivial changes)
sc git commit --nit

# 3. Commit with traceability
sc git commit file1.js -m "feat(feature): description (REQ-XXX)"

# 4. Commit with --dry-run
sc git commit file1.js -m "test commit" --dry-run

# 5. Variadic files (multiple files)
sc git commit file1.js file2.js file3.js -m "multi-file commit"
```

**Expected**:
- Files committed with proper message
- Nit detection works
- Traceability references preserved
- Dry-run shows preview without committing
- All files staged and committed

**Issues found**: _______________

---

### ✅ `sc git merge`

**Test Cases**:
```bash
# 1. Basic merge (current branch to main)
sc git merge

# 2. Merge specific branch
sc git merge feature/my-branch

# 3. Merge with auto-push
sc git merge --push

# 4. Merge and delete local branch
sc git merge --delete-local

# 5. Interactive merge
sc git merge -i
```

**Expected**:
- Safe merge with rebase
- Push to remote when --push specified
- Local branch deleted when --delete-local
- Interactive prompts work

**Issues found**: _______________

---

### ✅ `sc git push`

**Test Cases**:
```bash
# 1. Basic push
sc git push

# 2. Force push (with safety checks)
sc git push --force

# 3. Push with upstream tracking
sc git push -u origin my-branch
```

**Expected**:
- Changes pushed to remote
- Force push warns about risks
- Upstream tracking set correctly

**Issues found**: _______________

---

### ✅ `sc git branch`

**Test Cases**:
```bash
# 1. List branches
sc git branch

# 2. Create new branch
sc git branch feature/new-feature

# 3. Create from requirement
sc git branch REQ-XXX
```

**Expected**:
- Branches listed correctly
- New branch created
- Branch name follows conventions

**Issues found**: _______________

---

### ✅ `sc git check`

**Test Cases**:
```bash
# 1. Basic repository check
sc git check

# 2. Verbose check
sc git check --verbose
```

**Expected**:
- Repository status displayed
- Work patterns detected
- Next steps recommended
- Verbose shows detailed info

**Issues found**: _______________

---

## Phase 2: Planning Commands (P0-2) - 5 commands

### ✅ `sc planning req new`

**Test Cases**:
```bash
# 1. Create basic requirement
sc planning req new "Test Requirement"

# 2. Create with epic
sc planning req new "Epic Requirement" --epic=epic-001

# 3. Create with category and priority
sc planning req new "Priority Req" --category=core --priority=high

# 4. Create with all options
sc planning req new "Full Req" --epic=epic-001 --category=workflow --priority=high --pattern=feature
```

**Expected**:
- Requirement file created in correct location
- Frontmatter populated correctly
- Auto-WIP registration if configured
- Unique ID assigned

**Issues found**: _______________

---

### ✅ `sc planning req list`

**Test Cases**:
```bash
# 1. List all requirements
sc planning req list

# 2. Filter by status
sc planning req list --status=done

# 3. Filter by epic
sc planning req list --epic=epic-001

# 4. YAML format
sc planning req list --format=yaml
```

**Expected**:
- Requirements displayed in table
- Filters work correctly
- YAML output valid
- Performance acceptable (<2s for 100+ reqs)

**Issues found**: _______________

---

### ✅ `sc planning req show`

**Test Cases**:
```bash
# 1. Show specific requirement
sc planning req show REQ-WORKFLOW-001

# 2. Show with verbose
sc planning req show REQ-WORKFLOW-001 --verbose
```

**Expected**:
- Requirement details displayed
- Frontmatter and content shown
- Verbose includes additional metadata

**Issues found**: _______________

---

### ✅ `sc planning req update`

**Test Cases**:
```bash
# 1. Update status
sc planning req update REQ-WORKFLOW-001 --status=in-progress

# 2. Update priority
sc planning req update REQ-WORKFLOW-001 --priority=high

# 3. Update phase
sc planning req update REQ-WORKFLOW-001 --phase=implementing
```

**Expected**:
- Requirement file updated
- Frontmatter modified correctly
- Git tracking updated if configured

**Issues found**: _______________

---

### ✅ `sc planning req validate`

**Test Cases**:
```bash
# 1. Validate single requirement
sc planning req validate REQ-WORKFLOW-001

# 2. Validate all requirements
sc planning req validate --all

# 3. Validate with auto-fix
sc planning req validate --fix
```

**Expected**:
- Validation errors reported
- Auto-fix corrects issues
- Exit code reflects validation status

**Issues found**: _______________

---

## Phase 3: Test Commands (P1-3) - 2 commands

### ✅ `sc test`

**Test Cases**:
```bash
# 1. Run all tests
sc test

# 2. Run specific test file
sc test tests/unit/example.test.js

# 3. Run with pattern
sc test tests/integration/**/*.test.js

# 4. Capture logs
sc test --capture-logs
```

**Expected**:
- Tests execute via npm test
- Logs captured automatically
- Test evidence updated
- Exit code reflects test results

**Issues found**: _______________

---

### ✅ `sc test-map`

**Test Cases**:
```bash
# 1. Show test mapping
sc test-map

# 2. Show for specific requirement
sc test-map REQ-WORKFLOW-001
```

**Expected**:
- Test-to-requirement mapping displayed
- Coverage gaps identified
- Recommendations shown

**Issues found**: _______________

---

## Phase 4: Agent Commands (P2-4) - 3 commands

### ✅ `sc agent status`

**Test Cases**:
```bash
# 1. Check current agent status
sc agent status
```

**Expected**:
- Current agent/session displayed
- Worktree assignment shown
- Branch info included

**Issues found**: _______________

---

### ✅ `sc agent assign`

**Test Cases**:
```bash
# 1. Create and assign worktree
sc agent assign my-feature

# 2. Assign with requirement
sc agent assign my-feature --requirement=REQ-XXX
```

**Expected**:
- Worktree created
- Branch created
- Assignment registered
- Instructions displayed

**Issues found**: _______________

---

### ✅ `sc agent unassign`

**Test Cases**:
```bash
# 1. Unassign and keep worktree
sc agent unassign --keep

# 2. Unassign and remove worktree
sc agent unassign --remove
```

**Expected**:
- Assignment removed from registry
- Worktree kept or removed as specified
- Clean state after unassignment

**Issues found**: _______________

---

## Phase 4: WIP Registry Commands (P2-5) - 5 commands

### ✅ `sc workflow wip register`

**Test Cases**:
```bash
# 1. Register file for WIP tracking
sc workflow wip register file1.js

# 2. Register with feature
sc workflow wip register file1.js --feature=my-feature

# 3. Register with requirement
sc workflow wip register file1.js --requirement=REQ-XXX
```

**Expected**:
- File added to WIP registry
- Feature/requirement linked
- Registry file updated

**Issues found**: _______________

---

### ✅ `sc workflow wip unregister`

**Test Cases**:
```bash
# 1. Unregister file
sc workflow wip unregister file1.js

# 2. Unregister all files for feature
sc workflow wip unregister --feature=my-feature
```

**Expected**:
- File removed from registry
- Registry cleaned up
- No orphaned entries

**Issues found**: _______________

---

### ✅ `sc workflow wip list`

**Test Cases**:
```bash
# 1. List all WIP files
sc workflow wip list

# 2. List for specific feature
sc workflow wip list --feature=my-feature

# 3. List for specific user
sc workflow wip list --user=alice
```

**Expected**:
- WIP files displayed
- Filters work correctly
- Metadata shown (feature, requirement, user)

**Issues found**: _______________

---

### ✅ `sc workflow wip status`

**Test Cases**:
```bash
# 1. Show WIP status
sc workflow wip status

# 2. Show with user breakdown
sc workflow wip status --by-user
```

**Expected**:
- Summary statistics shown
- User breakdown if requested
- File counts accurate

**Issues found**: _______________

---

### ✅ `sc workflow wip cleanup`

**Test Cases**:
```bash
# 1. Dry-run cleanup
sc workflow wip cleanup --dry-run

# 2. Actual cleanup
sc workflow wip cleanup

# 3. Force cleanup
sc workflow wip cleanup --force
```

**Expected**:
- Orphaned entries identified
- Dry-run shows preview
- Actual cleanup removes orphans
- Registry valid after cleanup

**Issues found**: _______________

---

## Phase 4: Planning Feature Commands (P2-6) - 3 commands

### ✅ `sc planning feature audit`

**Test Cases**:
```bash
# 1. Audit all features
sc planning feature audit

# 2. Audit specific feature
sc planning feature audit my-feature

# 3. Verbose audit
sc planning feature audit --verbose
```

**Expected**:
- Feature structure validated
- Issues reported
- Recommendations provided

**Issues found**: _______________

---

### ✅ `sc planning feature create`

**Test Cases**:
```bash
# 1. Create basic feature
sc planning feature create my-feature --domain=my-domain

# 2. Create with all metadata
sc planning feature create my-feature --domain=my-domain --description="Feature description"
```

**Expected**:
- Feature directory created
- README.md generated
- Registry updated
- Valid structure

**Issues found**: _______________

---

### ✅ `sc planning feature move`

**Test Cases**:
```bash
# 1. Move feature to new domain
sc planning feature move old-domain/my-feature new-domain

# 2. Move with dry-run
sc planning feature move old-domain/my-feature new-domain --dry-run
```

**Expected**:
- Feature moved to new location
- Registry updated
- References updated
- Dry-run shows preview

**Issues found**: _______________

---

## Summary

**Total Commands**: 23
**Commands Tested**: ___ / 23
**Issues Found**: ___
**Critical Issues**: ___

**Overall Status**: ⬜ Not Started | 🔄 In Progress | ✅ Complete

---

## Notes

- Test in a non-production repository or branch
- Document any unexpected behavior
- Report performance issues (commands taking >5s)
- Note any missing features vs legacy implementation

---

## Issue Template

When you find an issue, document it like this:

```
Command: sc git commit
Test: Basic commit with message
Issue: Error message unclear when file doesn't exist
Severity: Low
Expected: "File not found: file1.js"
Actual: "Error: ENOENT"
```

---

**Last Updated**: 2026-01-17
**Migration Phase**: Phase 1-4 (P0-P2 commands)
