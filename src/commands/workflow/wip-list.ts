/**
 * Workflow WIP List Command - Universal Command Schema
 */

import { LazyUniversalCommand } from '../../LazyUniversalCommand';

export const wipListCommand = new LazyUniversalCommand({
  name: 'workflow wip list',
  description: 'List WIP-tracked files',
  category: 'workflow',
  scope: 'development',
  keywords: ['wip', 'list', 'files', 'workflow'],

  cli: {
    path: ['workflow', 'wip', 'list'],
    allowUnknownOption: false,
    passThroughOptions: false,
  },

  handlerPath: './wip-list-handler',
  handlerExport: 'handler',

  input: {
    parameters: [
      {
        name: 'olderThan',
        type: 'string',
        description: 'Filter files older than N days (e.g., "7d")',
        required: false,
      },
      {
        name: 'userid',
        type: 'string',
        description: 'Filter by user',
        required: false,
      },
      {
        name: 'me',
        type: 'boolean',
        description: 'Show only files registered by current user',
        required: false,
        default: false,
      },
      {
        name: 'unassigned',
        type: 'boolean',
        description: 'Show only unassigned files',
        required: false,
        default: false,
      },
      {
        name: 'pathsOnly',
        type: 'boolean',
        description: 'Output paths only',
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
        files: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              path: { type: 'string' },
              feature: { type: 'string' },
              requirement: { type: 'string' },
              userid: { type: 'string' },
              reason: { type: 'string' },
              last_modified: { type: 'string' },
            },
          },
        },
        count: { type: 'number' },
      },
    },
  },

  mcp: {
    toolName: 'workflow_wip_list',
  },
});
