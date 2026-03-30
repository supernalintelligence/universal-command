/**
 * Test Audit Command - Universal Command Schema
 */

import { LazyUniversalCommand } from '../../LazyUniversalCommand';

export const testAuditCommand = new LazyUniversalCommand({
  name: 'test audit',
  description: 'Audit test coverage, traceability, and quality',
  category: 'testing',
  scope: 'development',
  keywords: ['test', 'audit', 'traceability', 'coverage', 'requirements'],

  cli: {
    path: ['test', 'audit'],
    allowUnknownOption: false,
    passThroughOptions: false,
  },

  handlerPath: './audit-handler',
  handlerExport: 'handler',

  input: {
    parameters: [
      {
        name: 'action',
        type: 'string',
        description: 'Audit action: cli-tests, requirements, skipped, traceability, all',
        required: false,
        positional: true,
        default: 'traceability',
      },
      {
        name: 'fix',
        type: 'boolean',
        description: 'Attempt to auto-fix issues',
        required: false,
        default: false,
      },
      {
        name: 'dryRun',
        type: 'boolean',
        description: 'Preview fixes without applying',
        required: false,
        default: false,
      },
      {
        name: 'cosmetic',
        type: 'boolean',
        description: 'For skipped: only target cosmetic tests',
        required: false,
        default: false,
      },
      {
        name: 'verbose',
        type: 'boolean',
        description: 'Show detailed output',
        required: false,
        default: false,
      },
      {
        name: 'format',
        type: 'string',
        description: 'Output format: table, json, markdown',
        required: false,
        default: 'table',
      },
      {
        name: 'output',
        type: 'string',
        description: 'Save report to file',
        required: false,
      },
      {
        name: 'skipped',
        type: 'boolean',
        description: 'Analyze .skip() and .todo() tests',
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
        action: { type: 'string' },
        issues: { type: 'array' },
        fixed: { type: 'number' },
        message: { type: 'string' },
      },
    },
  },

  mcp: {
    toolName: 'test_audit',
  },
});
