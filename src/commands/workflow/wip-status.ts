/**
 * Workflow WIP Status Command - Universal Command Schema
 */

import { LazyUniversalCommand } from '../../LazyUniversalCommand';

export const wipStatusCommand = new LazyUniversalCommand({
  name: 'workflow wip status',
  description: 'Show WIP registry status',
  category: 'workflow',
  scope: 'development',
  keywords: ['wip', 'status', 'stats', 'workflow'],

  cli: {
    path: ['workflow', 'wip', 'status'],
    allowUnknownOption: false,
    passThroughOptions: false,
  },

  handlerPath: './wip-status-handler',
  handlerExport: 'handler',

  input: {
    parameters: [],
  },

  output: {
    type: 'json',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        status: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            active: { type: 'number' },
            old: { type: 'number' },
            warnDays: { type: 'number' },
          },
        },
        statsByUser: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: {
              total: { type: 'number' },
              old: { type: 'number' },
            },
          },
        },
      },
    },
  },

  mcp: {
    toolName: 'workflow_wip_status',
  },
});
