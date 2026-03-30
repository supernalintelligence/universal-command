/**
 * Agent Unassign Command - Universal Command Schema
 */

import { LazyUniversalCommand } from '../../LazyUniversalCommand';

export const agentUnassignCommand = new LazyUniversalCommand({
  name: 'agent unassign',
  description: 'Unassign from current worktree',
  category: 'agent',
  scope: 'development',
  keywords: ['agent', 'worktree', 'unassign', 'remove', 'cleanup'],

  cli: {
    path: ['agent', 'unassign'],
    allowUnknownOption: false,
    passThroughOptions: false,
  },

  handlerPath: './unassign-handler',
  handlerExport: 'handler',

  input: {
    parameters: [
      {
        name: 'remove',
        type: 'boolean',
        description: 'Delete the worktree after unassigning',
        required: false,
        default: false,
      },
      {
        name: 'keep',
        type: 'boolean',
        description: 'Keep the worktree after unassigning',
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
    toolName: 'agent_unassign',
  },
});
