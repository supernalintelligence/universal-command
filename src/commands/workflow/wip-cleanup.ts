/**
 * Workflow WIP Cleanup Command - Universal Command Schema
 */

import { LazyUniversalCommand } from '../../LazyUniversalCommand';

export const wipCleanupCommand = new LazyUniversalCommand({
  name: 'workflow wip cleanup',
  description: 'Clean up old WIP-tracked files',
  category: 'workflow',
  scope: 'development',
  keywords: ['wip', 'cleanup', 'remove', 'old', 'workflow'],

  cli: {
    path: ['workflow', 'wip', 'cleanup'],
    allowUnknownOption: false,
    passThroughOptions: false,
  },

  handlerPath: './wip-cleanup-handler',
  handlerExport: 'handler',

  input: {
    parameters: [
      {
        name: 'olderThan',
        type: 'string',
        description: 'Clean files older than N days (e.g., "7d")',
        required: false,
        default: '7d',
      },
      {
        name: 'dryRun',
        type: 'boolean',
        description: 'Show what would be cleaned without doing it',
        required: false,
        default: false,
      },
      {
        name: 'force',
        type: 'boolean',
        description: 'Skip confirmation prompts',
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
        cleaned: { type: 'number' },
        message: { type: 'string' },
      },
    },
  },

  mcp: {
    toolName: 'workflow_wip_cleanup',
  },
});
