/**
 * Modal Spawn Command - Universal Command Schema
 */

import { LazyUniversalCommand } from '../../LazyUniversalCommand';

export const modalSpawnCommand = new LazyUniversalCommand({
  name: 'modal spawn',
  description: 'Spawn a Modal agent with a task',
  category: 'modal',
  scope: 'development',
  keywords: ['modal', 'spawn', 'agent', 'task', 'run'],

  cli: {
    path: ['modal', 'spawn'],
    allowUnknownOption: false,
    passThroughOptions: false,
  },

  handlerPath: './spawn-handler',
  handlerExport: 'handler',

  input: {
    parameters: [
      {
        name: 'task',
        type: 'string',
        description: 'Task description for the Modal agent',
        required: true,
        positional: true,
      },
      {
        name: 'agent',
        type: 'string',
        description: 'Agent ID to use (default: worker)',
        required: false,
        default: 'worker',
      },
      {
        name: 'repo',
        type: 'string', 
        description: 'Git workspace repository URL',
        required: false,
      },
    ],
  },

  output: {
    type: 'json',
    schema: {
      type: 'object',
      properties: {
        agentId: { type: 'string' },
        task: { type: 'string' },
        repo: { type: 'string' },
        success: { type: 'boolean' },
        output: { type: 'string' },
      },
    },
  },

  mcp: {
    toolName: 'modal_spawn_agent',
  },
});