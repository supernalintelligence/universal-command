/**
 * Planning Req Validate Command - Universal Command Schema
 */

import { LazyUniversalCommand } from '../../LazyUniversalCommand';

export const planningReqValidateCommand = new LazyUniversalCommand({
  name: 'planning req validate',
  description: 'Validate requirement content and naming',
  category: 'planning',
  scope: 'workflow-management',
  keywords: ['planning', 'requirement', 'validate', 'check'],

  cli: {
    path: ['planning', 'req', 'validate'],
    allowUnknownOption: false,
    passThroughOptions: false,
  },

  handlerPath: './req-validate-handler',
  handlerExport: 'handler',

  input: {
    parameters: [
      {
        name: 'requirementId',
        type: 'string',
        description: 'Requirement ID to validate',
        required: true,
        positional: true,
      },
      {
        name: 'content',
        type: 'boolean',
        description: 'Validate content only',
        required: false,
        default: false,
      },
      {
        name: 'naming',
        type: 'boolean',
        description: 'Validate naming only',
        required: false,
        default: false,
      },
      {
        name: 'all',
        type: 'boolean',
        description: 'Validate all aspects',
        required: false,
        default: false,
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
        valid: { type: 'boolean' },
        errors: { type: 'array' },
        message: { type: 'string' },
      },
    },
  },

  mcp: {
    toolName: 'planning_req_validate',
  },
});
