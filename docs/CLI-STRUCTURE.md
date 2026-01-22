# SC CLI Command Structure

## Current Structure (Legacy)

All commands are implemented in `supernal-code-package/lib/cli/commands/`

### Top-Level Commands

```
sc
├── code                    - Code quality and contract management
├── dashboard              - Dashboard management
├── traceability|trace     - Traceability matrix
├── workflow               - Project workflow management
│   ├── wip               - Work-in-progress registry
│   │   ├── register
│   │   ├── unregister
│   │   ├── list
│   │   ├── status
│   │   ├── cleanup
│   │   └── check
│   ├── controlled        - Controlled files system
│   ├── hooks            - AI IDE hooks
│   ├── registry         - Document registry
│   └── naming           - Naming conventions
├── monitor|status         - Monitor development status
├── search|s              - Search documentation
├── risk                  - Risk management
├── health                - Project health checks
├── logs                  - Query captured logs
├── reference             - Version-aware references
├── connect               - External services
├── git                   - Git workflow operations
│   ├── commit
│   ├── merge
│   ├── push
│   ├── branch
│   └── check
├── compliance            - Compliance frameworks
├── system                - System management
├── audit                 - Unified audit system
├── date-validate         - Fix hardcoded dates
├── agent                 - Agent workflow management
│   ├── status
│   ├── assign
│   ├── unassign
│   ├── list
│   ├── cleanup
│   └── script
├── docs                  - Documentation management
├── init                  - Equip repository
├── rules                 - Repository rules
├── help                  - Comprehensive help
├── template              - Template management
├── chat                  - AI conversation threads
├── collaborators         - Team contributors
├── repo                  - Repository management
├── planning              - Planning artifacts
│   ├── feature          - Feature planning
│   │   ├── audit
│   │   ├── create
│   │   └── move
│   ├── epic             - Epic planning
│   ├── req|requirement  - Requirement management
│   │   ├── new
│   │   ├── list
│   │   ├── show
│   │   ├── validate
│   │   └── generate-tests
│   ├── task             - Task management
│   ├── phase            - Phase management
│   ├── index            - Generate planning index
│   ├── features         - Feature registry
│   ├── business         - Business plan
│   ├── kanban           - Kanban task management
│   ├── kanban-ref|kb    - Reference-based Kanban
│   ├── audit            - Audit planning artifacts
│   ├── infer-state      - Infer status/phase
│   ├── priority         - Update priorities
│   ├── validate         - Quick validation
│   └── link-audit       - Audit hierarchical links
├── build                 - Run build with log capture
├── test                  - Run tests with log capture
│   └── audit            - Test traceability audit
└── run                   - Run with log capture
```

## Universal Command Migration

### Target Structure (packages/universal-command/src/commands/)

The universal-command package will mirror the legacy structure but with:
- Schema-based command definitions
- Lazy-loaded handlers
- Auto-generated MCP interfaces
- Consistent parameter validation

### Migration Status

#### Phase 1-3: COMPLETED ✅ (12 commands)

**P0-1: Git Commands (5/5)**
- ✅ `git commit` - Smart commit with nit detection
- ✅ `git merge` - Safe merge with rebase
- ✅ `git push` - Auto-push with safety checks
- ✅ `git branch` - Session management
- ✅ `git check` - Repository context

**P0-2: Planning Requirement Commands (5/5)**
- ✅ `planning req new` - Create requirements
- ✅ `planning req list` - List requirements
- ✅ `planning req show` - Show requirement details
- ✅ `planning req validate` - Validate requirements
- ✅ `planning req generate-tests` - Generate test stubs

**P1-3: Test Commands (2/2)**
- ✅ `test` - Run tests with evidence logging
- ✅ `test audit` - Test traceability audit

#### Phase 4: IN PROGRESS (11 commands)

**P2-4: Agent Commands (3/3) ✅**
Location: `src/commands/agent/`
- ✅ `agent status` - Show agent and worktree assignment
- ✅ `agent assign` - Assign to worktree
- ✅ `agent unassign` - Unassign from worktree

Files created:
- `status.ts`, `status-handler.ts`
- `assign.ts`, `assign-handler.ts`
- `unassign.ts`, `unassign-handler.ts`
- `__tests__/agent-commands.test.ts` (19 tests) ✅

**P2-5: WIP Registry Commands (5/5) ✅**
Location: `src/commands/workflow/`
- ✅ `workflow wip register` - Register WIP files
- ✅ `workflow wip unregister` - Unregister WIP files
- ✅ `workflow wip list` - List WIP files
- ✅ `workflow wip status` - WIP status
- ✅ `workflow wip cleanup` - Cleanup old WIP files

Files created:
- `wip-register.ts`, `wip-register-handler.ts`
- `wip-unregister.ts`, `wip-unregister-handler.ts`
- `wip-list.ts`, `wip-list-handler.ts`
- `wip-status.ts`, `wip-status-handler.ts`
- `wip-cleanup.ts`, `wip-cleanup-handler.ts`
- `__tests__/wip-commands.test.ts` (30 tests) ✅

**P2-6: Planning Feature Commands (3/3) ✅ SCHEMAS ONLY**
Location: `src/commands/planning/`
- ✅ `planning feature audit` - Audit feature documents
- ✅ `planning feature create` - Create feature from template
- ✅ `planning feature move` - Move feature to different domain

Files created:
- `feature-audit.ts`, `feature-audit-handler.ts`
- `feature-create.ts`, `feature-create-handler.ts`
- `feature-move.ts`, `feature-move-handler.ts`
- **Tests**: NOT YET CREATED (should be autogenerated)

### Command Naming Convention

**Pattern**: `{category} {subcategory} {action}`

Examples:
- `sc git commit` - category: git, action: commit
- `sc planning req new` - category: planning, subcategory: req, action: new
- `sc workflow wip register` - category: workflow, subcategory: wip, action: register
- `sc planning feature audit` - category: planning, subcategory: feature, action: audit

**Key Rule**: NO top-level `sc feature` - it's always `sc planning feature`

### File Structure

Each command requires:
1. **Schema file**: `{action}.ts` - Defines parameters, metadata, MCP interface
2. **Handler file**: `{action}-handler.ts` - Wraps legacy implementation
3. **Test file**: `__tests__/{category}-commands.test.ts` - Unit tests (or autogenerated)

Example:
```
src/commands/planning/
├── feature-audit.ts              # Schema
├── feature-audit-handler.ts      # Handler wrapper
├── feature-create.ts             # Schema
├── feature-create-handler.ts     # Handler wrapper
├── feature-move.ts               # Schema
├── feature-move-handler.ts       # Handler wrapper
└── __tests__/
    └── feature-commands.test.ts  # Tests (manual or autogenerated)
```

### Test Strategy

**Manual Tests** (what I created for Phase 4):
- Agent commands: 19 tests
- WIP commands: 30 tests
- Feature commands: PENDING

**Autogenerated Tests** (via `sc requirement generate-tests`):
- Based on requirements in `docs/requirements/`
- Gherkin scenarios → test stubs
- Requirement traceability built-in

**Decision**: Keep both
- Manual tests validate LazyUniversalCommand framework
- Autogenerated tests validate requirement compliance
- Compare and ensure no conflicts

### Next Steps

1. **Autogenerate tests for feature commands**:
   ```bash
   sc requirement generate-tests REQ-XXX
   ```

2. **Compare with manual tests**:
   - Ensure file naming doesn't conflict
   - Manual: `__tests__/feature-commands.test.ts`
   - Autogen: `__tests__/req-XXX-feature-*.test.ts`

3. **Update MIGRATION-STATUS.md**:
   - Phase 4: 11 commands (3 agent + 5 wip + 3 feature)
   - Test count: 296 → 345 (after adding agent + wip tests)

## Summary

**Current State**:
- Legacy: 197 commands in `supernal-code-package/lib/cli/commands/`
- Universal: 23 commands migrated to `packages/universal-command/src/commands/`
  - Phase 1-3: 12 commands (fully tested)
  - Phase 4: 11 commands (8 fully tested, 3 schemas-only)

**Key Corrections**:
- ❌ NO `sc feature` (top-level)
- ✅ YES `sc planning feature` (nested under planning)
- ✅ Agent commands have subcommands (status, assign, unassign)
- ✅ WIP commands nest under workflow (sc workflow wip)

**Test Philosophy**:
- Manual tests validate framework features (P0-1 to P0-4)
- Autogenerated tests validate requirements (via `sc requirement generate-tests`)
- Both coexist without conflicts
