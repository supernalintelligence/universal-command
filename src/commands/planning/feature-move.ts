/**
 * Planning Feature Move Command - Universal Command Schema
 */

import { LazyUniversalCommand } from '../../LazyUniversalCommand';

export const featureMoveCommand = new LazyUniversalCommand({
  name: 'planning feature move',
  description: 'Move a feature to a different domain',
  category: 'planning',
  scope: 'development',
  keywords: ['planning', 'feature', 'move', 'migrate', 'domain'],

  cli: {
    path: ['planning', 'feature', 'move'],
    allowUnknownOption: false,
    passThroughOptions: false,
  },

  handlerPath: './feature-move-handler',
  handlerExport: 'handler',

  input: {
    parameters: [
      {
        name: 'featureId',
        type: 'string',
        description: 'Feature ID to move',
        required: true,
        positional: true,
      },
      {
        name: 'targetDomain',
        type: 'string',
        description: 'Target domain',
        required: true,
        positional: true,
      },
    ],
  },

  output: {
    type: 'json',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        from: { type: 'string' },
        to: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },

  mcp: {
    toolName: 'planning_feature_move',
  },
});
