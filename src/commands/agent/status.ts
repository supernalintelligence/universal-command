/**
 * Agent Status Command - Universal Command Schema
 */

import { LazyUniversalCommand } from '../../LazyUniversalCommand';

export const agentStatusCommand = new LazyUniversalCommand({
  name: 'agent status',
  description: 'Show current agent and worktree assignment',
  category: 'agent',
  scope: 'development',
  keywords: ['agent', 'worktree', 'status', 'assignment', 'context'],

  cli: {
    path: ['agent', 'status'],
    allowUnknownOption: false,
    passThroughOptions: false,
  },

  handlerPath: './status-handler',
  handlerExport: 'handler',

  input: {
    parameters: [],
  },

  output: {
    type: 'json',
    schema: {
      type: 'object',
      properties: {
        agent: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            sessionId: { type: 'string' },
          },
        },
        assignment: {
          type: 'object',
          properties: {
            worktreeFeature: { type: 'string' },
            assignedAt: { type: 'string' },
            lastSeen: { type: 'string' },
          },
        },
        context: {
          type: 'object',
          properties: {
            isWorktree: { type: 'boolean' },
            isMainBranch: { type: 'boolean' },
            shouldPrompt: { type: 'boolean' },
            suggestedName: { type: 'string' },
          },
        },
      },
    },
  },

  mcp: {
    toolName: 'agent_status',
  },
});
