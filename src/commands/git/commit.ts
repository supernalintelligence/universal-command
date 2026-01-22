/**
 * Git Commit Command - Universal Command Schema
 *
 * Migrated from: supernal-code-package/lib/cli/commands/git/git-commit.js
 * Priority: P0-1 (CRITICAL - most frequently used command)
 *
 * Safe git commit with stash/unstash for AI workflows:
 * 1. Stashes unrelated changes
 * 2. Commits only specified files
 * 3. Restores stashed changes
 */

import { LazyUniversalCommand } from '../../LazyUniversalCommand';

export const gitCommitCommand = new LazyUniversalCommand({
  name: 'git commit',
  description: 'Safe git commit with stash/unstash for AI workflows',
  category: 'git',
  scope: 'developer-tooling',
  keywords: ['git', 'commit', 'vcs', 'ai-safe', 'stash'],

  cli: {
    path: ['git', 'commit'],
    allowUnknownOption: false,
    passThroughOptions: false,
  },

  handlerPath: './commit-handler',
  handlerExport: 'handler',

  input: {
    parameters: [
      // Positional argument: files to commit (variadic)
      {
        name: 'files',
        type: 'array',
        description: 'Files to commit',
        required: false,
        positional: true,
        variadic: true,
        default: [],
      },

      // Options (CLI flags auto-generated from parameter names)
      {
        name: 'message',
        type: 'string',
        description: 'Commit message',
        required: false,
      },
      {
        name: 'filesOption',
        type: 'string',
        description: 'Comma-separated file list (alternative to positional)',
        required: false,
      },
      {
        name: 'nit',
        type: 'boolean',
        description: 'Commit only trivial changes (trailing newlines)',
        required: false,
        default: false,
      },
      {
        name: 'fix',
        type: 'boolean',
        description: 'Auto-normalize excessive trailing newlines first',
        required: false,
        default: false,
      },
      {
        name: 'recursive',
        type: 'boolean',
        description: 'Include submodules when detecting nits',
        required: false,
        default: false,
      },
      {
        name: 'yes',
        type: 'boolean',
        description: 'Skip confirmation prompts',
        required: false,
        default: false,
      },
      {
        name: 'ai',
        type: 'boolean',
        description: 'Add [AI-COMMIT] tag',
        required: false,
        default: false,
      },
      {
        name: 'priority',
        type: 'boolean',
        description: 'Add [PRIORITY-UPDATE] tag',
        required: false,
        default: false,
      },
      {
        name: 'dryRun',
        type: 'boolean',
        description: 'Show plan without committing',
        required: false,
        default: false,
      },
      {
        name: 'verbose',
        type: 'boolean',
        description: 'Verbose output',
        required: false,
        default: false,
      },
      {
        name: 'auto',
        type: 'boolean',
        description: 'Agent-initiated commit (adds [SC] tag)',
        required: false,
        default: false,
      },
    ],
  },

  output: {
    type: 'json',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        commitHash: { type: 'string' },
        filesCommitted: { type: 'number' },
        message: { type: 'string' },
        dryRun: { type: 'boolean' },
      },
    },
  },

  mcp: {
    toolName: 'git_commit',
  },
});
