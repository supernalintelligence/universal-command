/**
 * Planning Req Show Command - Universal Command Schema
 */

import { LazyUniversalCommand } from '../../LazyUniversalCommand';

export const planningReqShowCommand = new LazyUniversalCommand({
  name: 'planning req show',
  description: 'Show requirement details by ID',
  category: 'planning',
  scope: 'workflow-management',
  keywords: ['planning', 'requirement', 'show', 'get', 'display'],

  cli: {
    path: ['planning', 'req', 'show'],
    allowUnknownOption: false,
    passThroughOptions: false,
  },

  handlerPath: './req-show-handler',
  handlerExport: 'handler',

  input: {
    parameters: [
      {
        name: 'requirementId',
        type: 'string',
        description: 'Requirement ID (e.g., REQ-042)',
        required: true,
        positional: true,
      },
      {
        name: 'format',
        type: 'string',
        description: 'Output format (json, markdown)',
        required: false,
      },
      {
        name: 'verbose',
        type: 'boolean',
        description: 'Verbose output',
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
        requirementId: { type: 'string' },
        content: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },

  mcp: {
    toolName: 'planning_req_show',
  },
});
