/**
 * Workflow WIP Unregister Command - Universal Command Schema
 */

import { LazyUniversalCommand } from '../../LazyUniversalCommand';

export const wipUnregisterCommand = new LazyUniversalCommand({
  name: 'workflow wip unregister',
  description: 'Unregister a file from WIP registry',
  category: 'workflow',
  scope: 'development',
  keywords: ['wip', 'unregister', 'remove', 'workflow'],

  cli: {
    path: ['workflow', 'wip', 'unregister'],
    allowUnknownOption: false,
    passThroughOptions: false,
  },

  handlerPath: './wip-unregister-handler',
  handlerExport: 'handler',

  input: {
    parameters: [
      {
        name: 'file',
        type: 'string',
        description: 'File path to unregister',
        required: true,
        positional: true,
      },
      {
        name: 'quiet',
        type: 'boolean',
        description: 'Suppress output',
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
        removed: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  },

  mcp: {
    toolName: 'workflow_wip_unregister',
  },
});
