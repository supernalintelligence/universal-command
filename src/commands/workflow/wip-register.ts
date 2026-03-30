/**
 * Workflow WIP Register Command - Universal Command Schema
 */

import { LazyUniversalCommand } from '../../LazyUniversalCommand';

export const wipRegisterCommand = new LazyUniversalCommand({
  name: 'workflow wip register',
  description: 'Register a file in WIP registry',
  category: 'workflow',
  scope: 'development',
  keywords: ['wip', 'register', 'track', 'workflow', 'feature'],

  cli: {
    path: ['workflow', 'wip', 'register'],
    allowUnknownOption: false,
    passThroughOptions: false,
  },

  handlerPath: './wip-register-handler',
  handlerExport: 'handler',

  input: {
    parameters: [
      {
        name: 'file',
        type: 'string',
        description: 'File path to register',
        required: true,
        positional: true,
      },
      {
        name: 'feature',
        type: 'string',
        description: 'Feature name',
        required: true,
      },
      {
        name: 'requirement',
        type: 'string',
        description: 'Requirement ID (e.g., REQ-042)',
        required: true,
      },
      {
        name: 'reason',
        type: 'string',
        description: 'Reason for WIP tracking',
        required: false,
        default: 'Work in progress',
      },
      {
        name: 'notes',
        type: 'string',
        description: 'Additional notes',
        required: false,
      },
      {
        name: 'userid',
        type: 'string',
        description: 'GitHub username (auto-detected if not provided)',
        required: false,
      },
      {
        name: 'addComment',
        type: 'boolean',
        description: 'Add WIP comment to file',
        required: false,
        default: false,
      },
      {
        name: 'autoCleanup',
        type: 'boolean',
        description: 'Enable auto-cleanup',
        required: false,
        default: true,
      },
    ],
  },

  output: {
    type: 'json',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        file: { type: 'string' },
        feature: { type: 'string' },
        requirement: { type: 'string' },
        userid: { type: 'string' },
        reason: { type: 'string' },
      },
    },
  },

  mcp: {
    toolName: 'workflow_wip_register',
  },
});
