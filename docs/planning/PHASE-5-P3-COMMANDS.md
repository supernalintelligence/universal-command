# Phase 5: P3 Priority Commands

**Status**: Ready to start
**Timeline**: Week 5 of migration
**Priority**: Medium (occasional use commands)

---

## Overview

Phase 5 focuses on migrating P3 (medium priority) commands that are used occasionally but not critical for daily workflows. These commands provide important functionality but can be deferred until core workflows are stable.

**Total Remaining**: 174 commands (after Phase 1-4 completion)
**Phase 5 Target**: ~15-20 commands

---

## Command Selection Criteria

P3 commands are:
- ✅ Used weekly/monthly (not daily)
- ✅ Important for specific workflows
- ✅ Not blocking critical operations
- ✅ Can tolerate minor issues during migration

---

## Recommended P3 Commands for Phase 5

### Group 1: Initialization & Setup (High Value)

#### `sc init` - Project Initialization
**Priority**: P3-1 (migrate first)
**Frequency**: One-time per repository
**Complexity**: Medium (prompts, file generation, template system)
**Value**: High (onboarding new repositories)

**Subcommands**:
- `sc init` - Interactive initialization
- `sc init --preset <name>` - Use preset configuration
- `sc init --content-module <name>` - Install content module

**Migration Effort**: 1-2 days
**Test Coverage Needed**: Integration tests for file generation

---

#### `sc system` - System Management
**Priority**: P3-2
**Frequency**: Weekly (upgrades, config changes)
**Complexity**: Medium (subcommands for config, upgrade, sync, license)

**Subcommands**:
- `sc system config` - Manage configuration
- `sc system upgrade` - Upgrade Supernal Coding
- `sc system sync` - Sync repositories
- `sc system license` - License management

**Migration Effort**: 2-3 days
**Test Coverage Needed**: Config validation, upgrade flow

---

### Group 2: Documentation & Search (Medium Value)

#### `sc docs` - Documentation Management
**Priority**: P3-3
**Frequency**: Weekly (documentation updates)
**Complexity**: Low-Medium (CRUD operations on docs)

**Subcommands**:
- `sc docs generate` - Generate documentation
- `sc docs validate` - Validate doc structure
- `sc docs links --fix` - Fix broken links

**Migration Effort**: 1-2 days
**Test Coverage Needed**: Doc validation, link checking

---

#### `sc search` - Global Search
**Priority**: P3-4
**Frequency**: Daily-Weekly (ad-hoc searches)
**Complexity**: Medium (search across docs, code, requirements)

**Subcommands**:
- `sc search <query>` - Search all content
- `sc search --type=requirement` - Filtered search
- `sc search --format=json` - Structured output

**Migration Effort**: 1-2 days
**Test Coverage Needed**: Search accuracy, performance

---

### Group 3: Code Quality & Validation (Medium Value)

#### `sc build` - Build with Log Capture
**Priority**: P3-5
**Frequency**: Daily (but often via npm/pnpm directly)
**Complexity**: Low (wrapper around build commands)

**Subcommands**:
- `sc build` - Run default build
- `sc build --capture-logs` - Capture build logs
- `sc build --watch` - Watch mode

**Migration Effort**: 0.5-1 day
**Test Coverage Needed**: Log capture validation

---

#### `sc run` - Run with Log Capture
**Priority**: P3-6
**Frequency**: Daily (but often run directly)
**Complexity**: Low (wrapper around run commands)

**Subcommands**:
- `sc run <target>` - Run script/app
- `sc run --capture-logs` - Capture logs
- `sc run --env <file>` - Environment variables

**Migration Effort**: 0.5-1 day
**Test Coverage Needed**: Process spawning, log capture

---

#### `sc date-validate` - Date Validation
**Priority**: P3-7
**Frequency**: Monthly (maintenance)
**Complexity**: Low (scan and fix dates)

**Subcommands**:
- `sc date-validate` - Detect hardcoded dates
- `sc date-validate --fix` - Auto-fix dates
- `sc date-validate --dry-run` - Preview changes

**Migration Effort**: 0.5-1 day
**Test Coverage Needed**: Date detection accuracy

---

### Group 4: Repository Management (Low-Medium Value)

#### `sc repo` - Repository Management
**Priority**: P3-8
**Frequency**: Monthly (setup, maintenance)
**Complexity**: Medium (external repos, workspace management)

**Subcommands**:
- `sc repo add` - Add external repository
- `sc repo list` - List repositories
- `sc repo sync` - Sync repositories
- `sc repo remove` - Remove repository

**Migration Effort**: 1-2 days
**Test Coverage Needed**: Repo operations, workspace validation

---

#### `sc collaborators` - Team Management
**Priority**: P3-9
**Frequency**: Monthly (team changes)
**Complexity**: Low-Medium (CRUD for collaborators)

**Subcommands**:
- `sc collaborators add` - Add collaborator
- `sc collaborators list` - List team members
- `sc collaborators remove` - Remove collaborator

**Migration Effort**: 1 day
**Test Coverage Needed**: Collaborator validation

---

### Group 5: AI & Automation (Low Value for Migration)

#### `sc chat` - AI Conversation Management
**Priority**: P3-10
**Frequency**: Varies (AI-assisted workflows)
**Complexity**: Medium (thread management, context)

**Subcommands**:
- `sc chat start` - Start conversation
- `sc chat list` - List threads
- `sc chat show <id>` - Show conversation

**Migration Effort**: 1-2 days
**Test Coverage Needed**: Thread operations, context handling

**Note**: Consider deferring until P4 unless heavily used

---

#### `sc template` - Template Management
**Priority**: P3-11
**Frequency**: Monthly (template updates)
**Complexity**: Medium (template CRUD, sync)

**Subcommands**:
- `sc template list` - List templates
- `sc template apply` - Apply template
- `sc template create` - Create template

**Migration Effort**: 1-2 days
**Test Coverage Needed**: Template validation, application

---

### Group 6: Advanced Workflows (Defer to P4)

#### `sc connect` - External Service Integration
**Priority**: P3-12 (consider P4)
**Frequency**: Rare (specific integrations)
**Complexity**: High (plugin system, multiple services)

**Migration Effort**: 2-3 days
**Recommendation**: Defer to P4 unless critical

---

## Phase 5 Recommended Order

**Week 5 Focus** (highest value first):

1. ✅ **`sc init`** (1-2 days) - Onboarding critical
2. ✅ **`sc system`** (2-3 days) - Maintenance critical
3. ✅ **`sc docs`** (1-2 days) - Documentation workflow
4. ✅ **`sc search`** (1-2 days) - Developer productivity
5. ✅ **`sc build`** (0.5-1 day) - Build workflow
6. ✅ **`sc run`** (0.5-1 day) - Run workflow
7. ✅ **`sc date-validate`** (0.5-1 day) - Maintenance
8. ✅ **`sc repo`** (1-2 days) - If multi-repo used
9. ✅ **`sc collaborators`** (1 day) - If team coordination needed

**Total Effort**: ~10-15 days for 9 commands

**Remaining for P4**: ~165 commands (lower priority, utilities, rare usage)

---

## Migration Strategy

For each command:

1. **Schema Definition** (1-2 hours)
   - Define command schema with all parameters
   - Map CLI options to universal-command parameters
   - Define output schema

2. **Handler Wrapper** (1-2 hours)
   - Create handler that wraps existing implementation
   - Map universal-command inputs to legacy function
   - Validate outputs

3. **Manual Tests** (1-2 hours)
   - Create framework validation tests
   - Test P0 features (subcommand trees, lazy loading, etc.)
   - Validate parameter handling

4. **Integration Tests** (optional, 2-4 hours)
   - Create integration tests if complex
   - Test end-to-end workflows

5. **Documentation** (30 min - 1 hour)
   - Update MIGRATION-STATUS.md
   - Add to test strategy document

**Average**: ~1 day per command (improving with practice)

---

## Success Criteria

Phase 5 is complete when:

- ✅ All selected P3 commands migrated
- ✅ Manual tests passing (framework validation)
- ✅ Integration tests passing (if created)
- ✅ No regressions in daily workflows
- ✅ Performance acceptable (<2s startup)
- ✅ Documentation updated

---

## Risk Assessment

**Low Risk Commands** (migrate first):
- `sc build`, `sc run`, `sc date-validate`
- Simple wrappers, minimal logic

**Medium Risk Commands** (migrate with caution):
- `sc init`, `sc docs`, `sc search`
- More complex, user-facing

**High Risk Commands** (defer if possible):
- `sc connect`, `sc template` (complex plugins)
- Consider P4 migration

---

## Performance Targets

All P3 commands must meet:
- ✅ Cold start (help): <100ms
- ✅ Execution: <2s for simple operations
- ✅ Lazy loading: No handler imported until execution
- ✅ No startup regressions vs legacy

---

## Next Steps After Phase 5

1. **Performance Validation** - Measure actual improvements
2. **Manual Testing** - Validate all migrated commands work
3. **Phase 6 Planning** - Identify P4 commands
4. **Production Validation** - Use in daily workflows for 1 week
5. **Handler Refactoring** (Phase 9) - Remove legacy dependencies

---

## Related Documentation

- [MIGRATION-STATUS.md](./MIGRATION-STATUS.md) - Overall migration progress
- [PRIORITY-MIGRATION-PLAN.md](./PRIORITY-MIGRATION-PLAN.md) - Full priority plan
- [TEST-STRATEGY-COMPARISON.md](../TEST-STRATEGY-COMPARISON.md) - Test approaches
- [cli-migration-backlog.md](./cli-migration-backlog.md) - SDK feature gaps

---

**Last Updated**: 2026-01-17
**Status**: Ready to execute
**Estimated Completion**: Week 6 (after ~10-15 days work)
