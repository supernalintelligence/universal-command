/**
 * Email Check Command — Check if email exists (deduplication)
 */

import { LazyUniversalCommand } from '../../LazyUniversalCommand';

export const emailCheckCommand = new LazyUniversalCommand({
  name: 'state email check',
  description: 'Check if an email ID exists (for deduplication)',
  category: 'state',
  scope: 'development',
  keywords: ['email', 'check', 'exists', 'dedup', 'deduplication'],

  cli: {
    path: ['state', 'email', 'check'],
  },

  handlerPath: './email-check-handler',
  handlerExport: 'handler',

  input: {
    parameters: [
      { name: 'id', type: 'string', required: true, description: 'Email message ID' },
    ],
  },

  output: {
    type: 'json',
    schema: {
      type: 'object',
      properties: {
        exists: { type: 'boolean' },
        id: { type: 'string' },
      },
    },
  },

  mcp: {
    toolName: 'state_email_check',
  },
});
