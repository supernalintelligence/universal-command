# Supernal Coding

> Development workflow automation with phase-aligned tools and autonomous execution

Supernal Coding (`sc`) provides a complete system for AI-accelerated development. This guide covers what you need to act effectively and where to find detailed guidance.

---

## The 12 Development Phases

Work flows through phases. Each phase has specific goals, outputs, and appropriate tools.

| #   | Phase                      | Purpose                     | Key Activities                                             |
| --- | -------------------------- | --------------------------- | ---------------------------------------------------------- |
| 1   | **Discovery**              | Find problems/opportunities | User research, pain point identification, idea generation  |
| 2   | **Research & Modeling**    | Understand the domain       | Competitive analysis, domain modeling, feasibility studies |
| 3   | **Design**                 | Architecture decisions      | System design, security review, compliance mapping         |
| 4   | **Planning**               | Break down the work         | Feature breakdown, estimation, prioritization              |
| 5   | **Technical Requirements** | Detailed specifications     | REQ-XXX documents, acceptance criteria, Gherkin scenarios  |
| 6   | **Tests**                  | Define done                 | Test stubs, test strategies, requirement validation tests  |
| 7   | **Build**                  | Implement features          | Code implementation, unit tests, component development     |
| 8   | **Epic Integration**       | Combine features            | Feature merging, integration tests, epic-level validation  |
| 9   | **Milestone Integration**  | Release preparation         | Cross-epic integration, release candidate assembly         |
| 10  | **Staging**                | Pre-production validation   | Staging deployment, UAT, performance testing               |
| 11  | **Production**             | Live deployment             | Production release, monitoring setup, rollback readiness   |
| 12  | **Operations**             | Maintain and improve        | Monitoring, incident response, feedback collection         |

**Note**: Phases 1-4 happen once per epic. Phases 5-7 repeat for each feature. Phases 8-12 happen after features complete.

---

## Feature Workflow: Exact Order of Operations

Follow this sequence when implementing features. The order matters.

### Step 1: Create Feature Structure

```bash
sc feature create \
  --id=my-feature \
  --domain=developer-tooling \
  --epic=epic-name \
  --priority=high
```

Creates `docs/features/{domain}/my-feature/` with README.md and subdirectories.

### Step 2: Create Requirement (if formal tracking needed)

```bash
sc planning req new "Feature title" \
  --epic=my-epic \
  --priority=high
```

Creates REQ-XXX document with acceptance criteria template.

### Step 3: Write Implementation Plan

Create `docs/features/{domain}/my-feature/planning/YYYY-MM-DD-implementation.md`

Use the `**File**:` pattern for code blocks:

```markdown
## Step 1: Create Types

**File**: `src/types/my-feature.ts`

\`\`\`typescript
export interface MyFeature {
id: string;
name: string;
}
\`\`\`
```

### Step 4: Generate Implementation Files

```bash
sc docs process docs/features/{domain}/my-feature/planning/implementation.md --commit
```

This extracts code blocks to files, updates planning doc with implementation status.

### Step 5: Generate Test Stubs

```bash
# From requirement
sc planning req generate-tests REQ-XXX

# Or manually create
mkdir -p tests/unit/my-feature
touch tests/unit/my-feature/my-feature.test.ts
```

### Step 6: Implement Tests (TDD)

Fill in test logic. Link tests to requirements in comments:

```typescript
describe('REQ-XXX: MyFeature', () => {
  it('should create feature with valid data', async () => {
    // Test implementation
  });
});
```

### Step 7: Run Tests Iteratively

```bash
# Run feature-specific tests during development
sc test tests/unit/my-feature/

# Run full suite when feature complete
sc test
```

### Step 8: Update Feature Status

Update README.md frontmatter:

```yaml
phase: 'testing' # or "complete"
tests:
  - tests/unit/my-feature/my-feature.test.ts
```

### Step 9: Commit with Traceability

```bash
sc git commit -m "feat(my-feature): implement feature (REQ-XXX)"
```

---

## Component Naming Patterns

Use consistent naming across the codebase.

### File Naming

| Type            | Pattern                | Example           |
| --------------- | ---------------------- | ----------------- |
| React Component | PascalCase.tsx         | `UserProfile.tsx` |
| Hook            | use + camelCase.ts     | `useAuthToken.ts` |
| Service         | camelCase + Service.ts | `authService.ts`  |
| Type/Interface  | PascalCase.ts          | `User.ts`         |
| Utility         | camelCase.ts           | `formatDate.ts`   |

### Feature Folder Structure

```
src/features/feature-name/
├── components/
│   └── FeatureName.tsx
├── hooks/
│   └── useFeature.ts
├── services/
│   └── featureService.ts
├── types/
│   └── Feature.ts
└── utils/
    └── formatFeature.ts
```

### Feature Domain Naming

Use 2-3 word descriptive names:

```
✅ user-authentication-gpg
✅ compliance-gdpr-framework
✅ dashboard-analytics-viewer

❌ auth-component (too generic)
❌ workflow (too vague)
❌ tools (meaningless)
```

**Golden Rule**: If someone sees just the folder name, will they know what it does?

---

## SC Command Groups

### Planning & Requirements

```
sc planning epic new       # Create epic
sc planning req new        # Create requirement
sc planning req validate   # Validate requirement
sc planning req generate-tests  # Generate test stubs
sc planning task           # Task management
```

### Features & Specs

```
sc feature create          # Create feature structure
sc feature list            # List features
sc feature show            # Show feature details
sc spec create             # Create spec for Ralph loop
sc spec validate           # Validate spec
```

### Code Generation

```
sc docs process            # Generate files from planning doc
sc docs validate           # Validate documentation
sc docs fix-links          # Fix broken links
```

### Testing

```
sc test                    # Run tests with evidence logging
sc test <path>             # Run specific tests
sc test-map show           # Show test mapping
sc traceability validate   # Validate requirement coverage
```

### Git & Workflow

```
sc git commit              # Commit with hooks
sc git branch              # Create feature branch
sc git merge               # Merge with safety checks
sc workflow wip            # WIP registry management
sc workflow status         # Current workflow state
```

### Agents & Automation

```
sc agent loop start        # Start Ralph loop
sc agent loop status       # Check loop status
sc agent loop abort        # Stop loop
sc agent assign            # Assign to worktree
sc agent unassign          # Release worktree
```

### Deployment

```
sc deploy                  # Deploy to Vercel
sc deploy --production     # Production deployment
sc deploy status           # Check deployment status
```

---

## Key Tools & Concepts

### Ralph Loops

Autonomous execution cycles. Agent reads spec, picks tasks, implements, marks complete, repeats.

**Three modes:**

- **Specification** - Well-defined 5-25 tasks → focused PR
- **Exploration** - Discovery/research → insights
- **Brute Force** - Automated testing → comprehensive coverage

Use: `sc spec create`, `sc spec validate`, `sc agent loop start`

### Specs

Specification files with Goal, Output, Requirements, Tasks. Source of truth for Ralph loops.

### Requirements (REQ-XXX)

Formal requirement documents enabling traceability. Code links to requirements, tests validate requirements.

### WIP Registry

Tracks work-in-progress files during multi-agent work. Prevents conflicts.

Use: `sc workflow wip register`, `sc workflow wip list`

### Worktrees

Git worktrees for parallel agent isolation. Each agent works in its own worktree.

Use: `sc agent assign`, `sc agent unassign`

---

## Available Agents & Skills

### Feature-Flow-Orchestrator

Use when you have a planning document or high-level spec for a complete feature.

Executes:

1. Feature structure creation
2. Requirement generation
3. Test stub generation
4. Code scaffolding
5. Traceability validation

### Ralph Loop Agent

Use when spec is validated and work is isolated (5-25 atomic tasks).

### Exploration Agent

Use when requirements are unclear and you need discovery.

---

## Common Workflow Patterns

### Pattern A: Simple Feature (No Formal Requirement)

```bash
sc feature create --id=helper-utils --domain=developer-tooling
# Write planning doc with **File**: pattern
sc docs process planning/implementation.md --commit
# Create tests
sc test tests/unit/helper-utils/
# Commit
sc git commit -m "feat(helper-utils): complete implementation"
```

### Pattern B: Feature with Requirement

```bash
sc planning req new "User Authentication" --epic=auth --priority=high
sc feature create --id=user-auth --domain=ai-workflow-system
# Write planning doc referencing REQ-XXX
sc docs process planning/implementation.md --commit
sc planning req generate-tests REQ-XXX
# Implement and test
sc test tests/requirements/req-xxx/
sc planning req update REQ-XXX --status=done
sc git commit -m "feat(user-auth): implement auth (REQ-XXX)"
```

### Pattern C: Autonomous Ralph Loop

```bash
sc spec create my-feature --requirement=REQ-XXX
sc spec validate docs/specs/my-feature.md
sc agent loop start docs/specs/my-feature.md --auto-commit
# Monitor
sc agent loop status
```

---

## Standard Operating Procedures (SOPs)

Located in `docs/workflow/sops/`

### Core SOPs

| SOP        | Topic                      |
| ---------- | -------------------------- |
| SOP-0      | 12-Phase Workflow Overview |
| SOP-0.1    | AI-Accelerated Workflow    |
| SOP-0.1.15 | Naming Conventions         |
| SOP-0.2    | Phase-Aligned Development  |

### Phase SOPs

| SOP      | Topic                          |
| -------- | ------------------------------ |
| SOP-4.01 | Feature Breakdown & Estimation |
| SOP-5.01 | Technical Requirements         |
| SOP-6.01 | Testing Strategy               |
| SOP-6.02 | E2E Testing (Playwright)       |
| SOP-7.01 | Implementation with AI         |

### Tool SOPs

| SOP      | Topic             |
| -------- | ----------------- |
| SOP-T.01 | Using SC CLI      |
| SOP-T.12 | Using Ralph Loops |

---

## Core Principles

### 1. Use SC Commands

The CLI encodes best practices. Don't bypass with raw git/npm.

### 2. Follow the Order

Plan → Document → Generate → Test → Verify. Don't skip steps.

### 3. Requirements Traceability

Features link to requirements. Commits reference REQ-XXX. Tests validate requirements.

### 4. Naming Matters

Use descriptive 2-3 word names. Generic names cause confusion.

---

## Getting More Information

| Need           | Where                            |
| -------------- | -------------------------------- |
| Command syntax | `sc <command> --help`            |
| All commands   | `sc --help`                      |
| Current state  | `sc workflow status`             |
| Detailed SOPs  | `docs/workflow/sops/`            |
| Phase guidance | `docs/workflow/phases.md`        |
| Feature rules  | `.cursor/rules/feature-flow.mdc` |

---

_Supernal Coding v1.1.2_
