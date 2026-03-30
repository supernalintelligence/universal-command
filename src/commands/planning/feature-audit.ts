/**
 * Planning Feature Audit Command - Universal Command Schema
 */

import { LazyUniversalCommand } from '../../LazyUniversalCommand';

export const featureAuditCommand = new LazyUniversalCommand({
  name: 'planning feature audit',
  description: 'Audit and validate feature planning documents',
  category: 'planning',
  scope: 'development',
  keywords: ['planning', 'feature', 'audit', 'validate', 'check'],

  cli: {
    path: ['planning', 'feature', 'audit'],
    allowUnknownOption: false,
    passThroughOptions: false,
  },

  handlerPath: './feature-audit-handler',
  handlerExport: 'handler',

  input: {
    parameters: [
      {
        name: 'featureId',
        type: 'string',
        description: 'Feature ID to audit (audits all if not specified)',
        required: false,
        positional: true,
      },
      {
        name: 'verbose',
        type: 'boolean',
        description: 'Verbose output with metadata',
        required: false,
        default: false,
      },
      {
        name: 'fix',
        type: 'boolean',
        description: 'Auto-fix issues',
        required: false,
        default: false,
      },
      {
        name: 'commit',
        type: 'boolean',
        description: 'Auto-commit fixes',
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
        audited: { type: 'number' },
        issues: { type: 'number' },
        fixed: { type: 'number' },
      },
    },
  },

  mcp: {
    toolName: 'planning_feature_audit',
  },
});
