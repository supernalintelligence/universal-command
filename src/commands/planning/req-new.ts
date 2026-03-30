/**
 * Planning Req New Command - Universal Command Schema
 *
 * Migrated from: supernal-code-package/lib/cli/commands/requirement/index.js (new action)
 * Priority: P0-2 (CRITICAL - requirement creation)
 *
 * Create new requirement with auto-WIP registration
 */

import { LazyUniversalCommand } from '../../LazyUniversalCommand';

export const planningReqNewCommand = new LazyUniversalCommand({
  name: 'planning req new',
  description: 'Create new requirement with auto-WIP registration',
  category: 'planning',
  scope: 'workflow-management',
  keywords: ['planning', 'requirement', 'create', 'new', 'gherkin'],

  cli: {
    path: ['planning', 'req', 'new'],
    allowUnknownOption: false,
    passThroughOptions: false,
  },

  handlerPath: './req-new-handler',
  handlerExport: 'handler',

  input: {
    parameters: [
      // Positional argument: title
      {
        name: 'title',
        type: 'string',
        description: 'Requirement title',
        required: true,
        positional: true,
      },

      // Options
      {
        name: 'epic',
        type: 'string',
        description: 'Epic this requirement belongs to',
        required: false,
      },
      {
        name: 'category',
        type: 'string',
        description: 'Category (infra, workflow, core, testing, content, compliance, code)',
        required: false,
      },
      {
        name: 'priority',
        type: 'string',
        description: 'Priority level (critical, high, medium, low)',
        required: false,
      },
      {
        name: 'requestType',
        type: 'string',
        description: 'Request type (feature, bug, enhancement, maintenance)',
        required: false,
      },
      {
        name: 'feature',
        type: 'string',
        description: 'Feature path for feature-specific requirements',
        required: false,
      },
      {
        name: 'tags',
        type: 'string',
        description: 'Comma-separated tags',
        required: false,
      },
      {
        name: 'status',
        type: 'string',
        description: 'Requirement status',
        required: false,
      },
      {
        name: 'assignee',
        type: 'string',
        description: 'Assignee for the requirement',
        required: false,
      },
      {
        name: 'dryRun',
        type: 'boolean',
        description: 'Preview changes without applying',
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
        name: 'noRegister',
        type: 'boolean',
        description: 'Disable auto-WIP registration',
        required: false,
        default: false,
      },
      {
        name: 'userid',
        type: 'string',
        description: 'User ID for WIP tracking',
        required: false,
      },
      {
        name: 'notes',
        type: 'string',
        description: 'Optional notes for WIP entry',
        required: false,
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
        filePath: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },

  mcp: {
    toolName: 'planning_req_new',
  },
});
