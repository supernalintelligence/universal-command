/**
 * Agent Assign Command - Universal Command Schema
 */

import { LazyUniversalCommand } from '../../LazyUniversalCommand';

export const agentAssignCommand = new LazyUniversalCommand({
  name: 'agent assign',
  description: 'Assign to a worktree (creates if not exists)',
  category: 'agent',
  scope: 'development',
  keywords: ['agent', 'worktree', 'assign', 'create', 'assignment'],

  cli: {
    path: ['agent', 'assign'],
    allowUnknownOption: false,
    passThroughOptions: false,
  },

  handlerPath: './assign-handler',
  handlerExport: 'handler',

  input: {
    parameters: [
      {
        name: 'name',
        type: 'string',
        description: 'Worktree/feature name',
        required: true,
        positional: true,
      },
      {
        name: 'requirement',
        type: 'string',
        description: 'Link to requirement (REQ-XXX)',
        required: false,
        aliases: ['r'],
      },
    ],
  },

  output: {
    type: 'json',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        worktreePath: { type: 'string' },
        branchName: { type: 'string' },
        created: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  },

  mcp: {
    toolName: 'agent_assign',
  },
});
