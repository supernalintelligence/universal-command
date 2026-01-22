/**
 * Planning Req List Command - Universal Command Schema
 *
 * Migrated from: supernal-code-package/lib/cli/commands/requirement/index.js (list action)
 * Priority: P0-2 (HIGH - requirement listing)
 *
 * List all requirements with filtering
 */

import { LazyUniversalCommand } from '../../LazyUniversalCommand';

export const planningReqListCommand = new LazyUniversalCommand({
  name: 'planning req list',
  description: 'List all requirements with filtering',
  category: 'planning',
  scope: 'workflow-management',
  keywords: ['planning', 'requirement', 'list', 'filter'],

  cli: {
    path: ['planning', 'req', 'list'],
    allowUnknownOption: false,
    passThroughOptions: false,
  },

  handlerPath: './req-list-handler',
  handlerExport: 'handler',

  input: {
    parameters: [
      {
        name: 'format',
        type: 'string',
        description: 'Output format (json, table, csv)',
        required: false,
      },
      {
        name: 'epic',
        type: 'string',
        description: 'Filter by epic',
        required: false,
      },
      {
        name: 'category',
        type: 'string',
        description: 'Filter by category',
        required: false,
      },
      {
        name: 'priority',
        type: 'string',
        description: 'Filter by priority',
        required: false,
      },
      {
        name: 'status',
        type: 'string',
        description: 'Filter by status',
        required: false,
      },
      {
        name: 'feature',
        type: 'string',
        description: 'Filter by feature path',
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
        requirements: { type: 'array' },
        count: { type: 'number' },
        message: { type: 'string' },
      },
    },
  },

  mcp: {
    toolName: 'planning_req_list',
  },
});
