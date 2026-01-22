/**
 * Planning Feature Create Command - Universal Command Schema
 */

import { LazyUniversalCommand } from '../../LazyUniversalCommand';

export const featureCreateCommand = new LazyUniversalCommand({
  name: 'planning feature create',
  description: 'Create a new feature from template',
  category: 'planning',
  scope: 'development',
  keywords: ['planning', 'feature', 'create', 'new', 'template'],

  cli: {
    path: ['planning', 'feature', 'create'],
    allowUnknownOption: false,
    passThroughOptions: false,
  },

  handlerPath: './feature-create-handler',
  handlerExport: 'handler',

  input: {
    parameters: [
      {
        name: 'id',
        type: 'string',
        description: 'Feature ID (kebab-case, e.g., my-feature)',
        required: true,
      },
      {
        name: 'title',
        type: 'string',
        description: 'Feature title (defaults to ID)',
        required: false,
      },
      {
        name: 'domain',
        type: 'string',
        description: 'Feature domain (from supernal.yaml)',
        required: true,
      },
      {
        name: 'epic',
        type: 'string',
        description: 'Epic ID this feature belongs to',
        required: false,
      },
      {
        name: 'priority',
        type: 'string',
        description: 'Priority: high, medium, low',
        required: false,
        default: 'medium',
      },
      {
        name: 'assignee',
        type: 'string',
        description: 'GitHub username of assignee',
        required: false,
      },
      {
        name: 'minimal',
        type: 'boolean',
        description: 'Skip creating subdirectories',
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
        featurePath: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },

  mcp: {
    toolName: 'planning_feature_create',
  },
});
