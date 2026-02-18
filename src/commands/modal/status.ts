/**
 * Modal Status Command - Universal Command Schema
 */

import { LazyUniversalCommand } from '../../LazyUniversalCommand';

export const modalStatusCommand = new LazyUniversalCommand({
  name: 'modal status',
  description: 'Show Modal deployment and agent status',
  category: 'modal',
  scope: 'development',
  keywords: ['modal', 'status', 'deployment', 'agents', 'logs'],

  cli: {
    path: ['modal', 'status'],
    allowUnknownOption: false,
    passThroughOptions: false,
  },

  handlerPath: './status-handler',
  handlerExport: 'handler',

  input: {
    parameters: [
      {
        name: 'user',
        type: 'string',
        description: 'Optional user to check status for',
        required: false,
        position: 0,
      },
    ],
  },

  output: {
    type: 'json',
    schema: {
      type: 'object',
      properties: {
        profile: { type: 'string' },
        deployments: { 
          type: 'array',
          items: { type: 'string' }
        },
        secrets: {
          type: 'array', 
          items: { type: 'string' }
        },
        user: { type: 'string' },
        success: { type: 'boolean' },
        output: { type: 'string' },
      },
    },
  },

  mcp: {
    toolName: 'modal_status',
  },
});