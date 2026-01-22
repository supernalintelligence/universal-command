/**
 * Git Branch Command - Universal Command Schema
 *
 * Migrated from: supernal-code-package/lib/cli/commands/branch/index.js
 * Priority: P0-1 (HIGH - session management)
 *
 * Session branch management for multi-agent workflows
 */

import { LazyUniversalCommand } from '../../LazyUniversalCommand';

export const gitBranchCommand = new LazyUniversalCommand({
  name: 'git branch',
  description: 'Session branch management for multi-agent workflows',
  category: 'git',
  scope: 'developer-tooling',
  keywords: ['git', 'branch', 'session', 'workflow'],

  cli: {
    path: ['git', 'branch'],
    allowUnknownOption: false,
    passThroughOptions: false,
  },

  handlerPath: './branch-handler',
  handlerExport: 'handler',

  input: {
    parameters: [
      // Positional argument: action
      {
        name: 'action',
        type: 'string',
        description: 'Action: start, finish, discard, list, status',
        required: false,
        positional: true,
        default: 'status',
      },

      // Options
      {
        name: 'base',
        type: 'string',
        description: 'Base branch for new session (default: main)',
        required: false,
      },
      {
        name: 'reconcile',
        type: 'string',
        description: 'Branch to reconcile with',
        required: false,
      },
      {
        name: 'notes',
        type: 'string',
        description: 'Session notes',
        required: false,
      },
      {
        name: 'push',
        type: 'boolean',
        description: 'Push changes after finish',
        required: false,
        default: false,
      },
      {
        name: 'pr',
        type: 'boolean',
        description: 'Create pull request after finish',
        required: false,
        default: false,
      },
      {
        name: 'user',
        type: 'string',
        description: 'Filter by user',
        required: false,
      },
      {
        name: 'active',
        type: 'boolean',
        description: 'Show only active sessions',
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
        action: { type: 'string' },
        sessionId: { type: 'string' },
        branch: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },

  mcp: {
    toolName: 'git_branch',
  },
});
