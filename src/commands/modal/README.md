# Modal Universal Commands

This directory contains Universal Commands for Modal agent operations, integrated with the Supernal Coding CLI system.

## Commands

### 1. `sc modal spawn <task>`
Spawns a Modal agent with a specific task.

**Options:**
- `--agent, -a <id>`: Agent ID to use (default: worker)
- `--repo, -r <url>`: Git workspace repository URL

**Examples:**
```bash
sc modal spawn "What is 2+2?"
sc modal spawn --agent researcher "Summarize AI news"
sc modal spawn --repo https://github.com/user/workspace "Check status"
```

### 2. `sc modal provision <user> <email>`
Provisions a Modal workspace for a new user.

**Options:**
- `--org, -o <name>`: Organization name (default: default)

**Examples:**
```bash
sc modal provision user123 user@example.com
sc modal provision alice alice@company.com --org acme-corp
```

### 3. `sc modal status [user]`
Shows Modal deployment and agent status.

**Examples:**
```bash
sc modal status
sc modal status user123
```

## Implementation

Each command is implemented as a `LazyUniversalCommand` with:
- **Schema definition**: Command structure, parameters, and validation
- **Handler**: TypeScript implementation that wraps the existing Modal CLI commands
- **Tests**: Unit tests for schema validation and basic functionality

## Files

- `spawn.ts` + `spawn-handler.ts`: Spawn agent command
- `provision.ts` + `provision-handler.ts`: Provision workspace command  
- `status.ts` + `status-handler.ts`: Status check command
- `index.ts`: Export all commands
- `__tests__/modal.test.ts`: Test suite

## Integration

The commands wrap the existing Modal CLI tools:
- `modal-spawn`: Located at `~/bin/modal-spawn`
- `modal-onboard`: Located at `~/bin/modal-onboard`
- `modal-manage`: Located at `~/bin/modal-manage`

Commands execute via `child_process.exec()` with proper error handling and output parsing.