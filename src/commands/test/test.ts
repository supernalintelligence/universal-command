/**
 * Test Command - Universal Command Schema
 */

import { LazyUniversalCommand } from '../../LazyUniversalCommand';

export const testCommand = new LazyUniversalCommand({
  name: 'test',
  description: 'Testing guidance, execution, and evidence logging system (REQ-106)',
  category: 'testing',
  scope: 'development',
  keywords: ['test', 'testing', 'evidence', 'compliance', 'results'],

  cli: {
    path: ['test'],
    allowUnknownOption: false,
    passThroughOptions: true,
  },

  handlerPath: './test-handler',
  handlerExport: 'handler',

  input: {
    parameters: [
      {
        name: 'action',
        type: 'string',
        description:
          'Action: guide, setup, validate, plan, run, results, evidence, doctor, map, structure',
        required: false,
        positional: true,
      },
      {
        name: 'target',
        type: 'string',
        description: 'Target for the action (command to run, requirement ID, test path, etc.)',
        required: false,
        positional: true,
      },
      {
        name: 'watch',
        type: 'boolean',
        description: 'Watch mode',
        required: false,
        default: false,
      },
      {
        name: 'coverage',
        type: 'boolean',
        description: 'Generate coverage report',
        required: false,
        default: false,
      },
      {
        name: 'verbose',
        type: 'boolean',
        description: 'Verbose output',
        required: false,
        default: false,
        aliases: ['v'],
      },
      {
        name: 'req',
        type: 'string',
        description: 'Link test run to requirement (e.g., REQ-106)',
        required: false,
      },
      {
        name: 'feature',
        type: 'string',
        description: 'Link test run to feature',
        required: false,
      },
      {
        name: 'compliance',
        type: 'boolean',
        description: 'Mark as compliance evidence (never auto-deleted)',
        required: false,
        default: false,
      },
      {
        name: 'evidence',
        type: 'boolean',
        description: 'Alias for --compliance',
        required: false,
        default: false,
      },
      {
        name: 'since',
        type: 'string',
        description: 'Filter results since date (YYYY-MM-DD)',
        required: false,
      },
      {
        name: 'format',
        type: 'string',
        description: 'Output format for results (table, json)',
        required: false,
      },
      {
        name: 'noAutoCommit',
        type: 'boolean',
        description: 'Skip automatic evidence commit (if configured)',
        required: false,
        default: false,
      },
    ],
  },

  output: {
    type: 'stream',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        exitCode: { type: 'number' },
        stdout: { type: 'string' },
        stderr: { type: 'string' },
        resultId: { type: 'string' },
        duration_ms: { type: 'number' },
      },
    },
  },

  mcp: {
    toolName: 'test',
  },
});
