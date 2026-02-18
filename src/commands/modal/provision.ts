/**
 * Modal Provision Command - Universal Command Schema
 */

import { LazyUniversalCommand } from '../../LazyUniversalCommand';

export const modalProvisionCommand = new LazyUniversalCommand({
  name: 'modal provision',
  description: 'Provision Modal agent workspace for a new user',
  category: 'modal',
  scope: 'development',
  keywords: ['modal', 'provision', 'onboard', 'user', 'workspace'],

  cli: {
    path: ['modal', 'provision'],
    allowUnknownOption: false,
    passThroughOptions: false,
  },

  handlerPath: './provision-handler',
  handlerExport: 'handler',

  input: {
    parameters: [
      {
        name: 'userId',
        type: 'string',
        description: 'User ID for the new workspace',
        required: true,
        positional: true,
      },
      {
        name: 'email',
        type: 'string',
        description: 'User email address',
        required: true,
        positional: true,
      },
      {
        name: 'org',
        type: 'string',
        description: 'Organization name (default: default)',
        required: false,
        default: 'default',
      },
    ],
  },

  output: {
    type: 'json',
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        email: { type: 'string' },
        org: { type: 'string' },
        workspacePath: { type: 'string' },
        success: { type: 'boolean' },
        output: { type: 'string' },
      },
    },
  },

  mcp: {
    toolName: 'modal_provision_workspace',
  },
});