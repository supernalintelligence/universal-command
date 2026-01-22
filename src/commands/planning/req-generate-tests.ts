/**
 * Planning Req Generate Tests Command - Universal Command Schema
 */

import { LazyUniversalCommand } from '../../LazyUniversalCommand';

export const planningReqGenerateTestsCommand = new LazyUniversalCommand({
  name: 'planning req generate-tests',
  description: 'Generate test stubs from requirement',
  category: 'planning',
  scope: 'workflow-management',
  keywords: ['planning', 'requirement', 'generate', 'tests', 'tdd'],

  cli: {
    path: ['planning', 'req', 'generate-tests'],
    allowUnknownOption: false,
    passThroughOptions: false,
  },

  handlerPath: './req-generate-tests-handler',
  handlerExport: 'handler',

  input: {
    parameters: [
      {
        name: 'requirementId',
        type: 'string',
        description: 'Requirement ID to generate tests for',
        required: true,
        positional: true,
      },
      {
        name: 'dryRun',
        type: 'boolean',
        description: 'Preview changes without writing',
        required: false,
        default: false,
      },
      {
        name: 'yes',
        type: 'boolean',
        description: 'Skip confirmation prompts',
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
        testsGenerated: { type: 'number' },
        filePaths: { type: 'array' },
        message: { type: 'string' },
      },
    },
  },

  mcp: {
    toolName: 'planning_req_generate_tests',
  },
});
