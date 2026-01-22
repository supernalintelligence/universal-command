/**
 * Git Check Command - Universal Command Schema
 *
 * Migrated from: supernal-code-package/lib/cli/commands/git/git-check.js
 * Priority: P0-1 (HIGH - repository health checks)
 *
 * Check repository context and status with recommendations
 */

import { LazyUniversalCommand } from '../../LazyUniversalCommand';

export const gitCheckCommand = new LazyUniversalCommand({
  name: 'git check',
  description: 'Check repository context and status with recommendations',
  category: 'git',
  scope: 'developer-tooling',
  keywords: ['git', 'check', 'status', 'context', 'health'],

  cli: {
    path: ['git', 'check'],
    allowUnknownOption: false,
    passThroughOptions: false,
  },

  handlerPath: './check-handler',
  handlerExport: 'handler',

  input: {
    parameters: [
      {
        name: 'verbose',
        type: 'boolean',
        description: 'Show detailed information',
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
        branch: { type: 'string' },
        status: { type: 'string' },
        uncommittedChanges: { type: 'boolean' },
        recentWork: { type: 'array', items: { type: 'string' } },
        message: { type: 'string' },
      },
    },
  },

  mcp: {
    toolName: 'git_check',
  },
});
