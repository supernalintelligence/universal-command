/**
 * Git Push Command - Universal Command Schema
 *
 * Migrated from: supernal-code-package/lib/cli/commands/git/git-merge-worktree.js (handleAutoPush)
 * Priority: P0-1 (HIGH - daily-use command)
 *
 * Auto-push to upstream with safety checks
 */

import { LazyUniversalCommand } from '../../LazyUniversalCommand';

export const gitPushCommand = new LazyUniversalCommand({
  name: 'git push',
  description: 'Push current branch to upstream with safety checks',
  category: 'git',
  scope: 'developer-tooling',
  keywords: ['git', 'push', 'upstream', 'remote'],

  cli: {
    path: ['git', 'push'],
    allowUnknownOption: false,
    passThroughOptions: false,
  },

  handlerPath: './push-handler',
  handlerExport: 'handler',

  input: {
    parameters: [
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
        branch: { type: 'string' },
        commitsPushed: { type: 'number' },
        message: { type: 'string' },
      },
    },
  },

  mcp: {
    toolName: 'git_push',
  },
});
