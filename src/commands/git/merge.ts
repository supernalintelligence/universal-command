/**
 * Git Merge Command - Universal Command Schema
 *
 * Migrated from: supernal-code-package/lib/cli/commands/git/merge-safe.js
 * Priority: P0-1 (CRITICAL - daily-use command)
 *
 * Safe merge workflow with rebase, conflict detection, and auto-push
 */

import { LazyUniversalCommand } from '../../LazyUniversalCommand';

export const gitMergeCommand = new LazyUniversalCommand({
  name: 'git merge',
  description: 'Safe merge workflow with automatic rebase and conflict detection',
  category: 'git',
  scope: 'developer-tooling',
  keywords: ['git', 'merge', 'rebase', 'branch', 'workflow'],

  cli: {
    path: ['git', 'merge'],
    allowUnknownOption: false,
    passThroughOptions: false,
  },

  handlerPath: './merge-handler',
  handlerExport: 'handler',

  input: {
    parameters: [
      // Positional argument: branch to merge (optional)
      {
        name: 'branch',
        type: 'string',
        description: 'Branch to merge (defaults to current branch)',
        required: false,
        positional: true,
      },

      // Options
      {
        name: 'autoPush',
        type: 'boolean',
        description: 'Push to remote after successful merge',
        required: false,
        default: false,
      },
      {
        name: 'push',
        type: 'boolean',
        description: 'Alias for autoPush',
        required: false,
        default: false,
      },
      {
        name: 'deleteLocal',
        type: 'boolean',
        description: 'Delete local branch after merge',
        required: false,
        default: false,
      },
      {
        name: 'delete',
        type: 'boolean',
        description: 'Alias for deleteLocal',
        required: false,
        default: false,
      },
      {
        name: 'interactive',
        type: 'boolean',
        description: 'Interactive mode with prompts',
        required: false,
        default: false,
      },
      {
        name: 'i',
        type: 'boolean',
        description: 'Short alias for interactive',
        required: false,
        default: false,
      },
      {
        name: 'quiet',
        type: 'boolean',
        description: 'Minimize output',
        required: false,
        default: false,
      },
      {
        name: 'q',
        type: 'boolean',
        description: 'Short alias for quiet',
        required: false,
        default: false,
      },
      {
        name: 'verbose',
        type: 'boolean',
        description: 'Verbose output',
        required: false,
        default: true,
      },
    ],
  },

  output: {
    type: 'json',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        cancelled: { type: 'boolean' },
        branchMerged: { type: 'string' },
        requirement: { type: 'string' },
        pushed: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  },

  mcp: {
    toolName: 'git_merge',
  },
});
