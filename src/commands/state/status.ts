/**
 * State Status Command — Show database status
 */

import { LazyUniversalCommand } from '../../LazyUniversalCommand';

export const stateStatusCommand = new LazyUniversalCommand({
  name: 'state status',
  description: 'Show agent state database status',
  category: 'state',
  scope: 'development',
  keywords: ['state', 'database', 'status', 'sqlite', 'agent'],

  cli: {
    path: ['state', 'status'],
  },

  handlerPath: './status-handler',
  handlerExport: 'handler',

  input: {
    parameters: [],
  },

  output: {
    type: 'json',
    schema: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        schemaVersion: { type: 'number' },
        emails: { type: 'number' },
        contacts: { type: 'number' },
        socialPosts: { type: 'number' },
        links: { type: 'number' },
        kvEntries: { type: 'number' },
      },
    },
  },

  mcp: {
    toolName: 'state_status',
  },
});
