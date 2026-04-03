/**
 * Email Add Command — Add or update an email record
 */

import { LazyUniversalCommand } from '../../LazyUniversalCommand';

export const emailAddCommand = new LazyUniversalCommand({
  name: 'state email add',
  description: 'Add or update an email record',
  category: 'state',
  scope: 'development',
  keywords: ['email', 'add', 'create', 'track'],

  cli: {
    path: ['state', 'email', 'add'],
  },

  handlerPath: './email-add-handler',
  handlerExport: 'handler',

  input: {
    parameters: [
      { name: 'id', type: 'string', required: true, description: 'Email message ID' },
      { name: 'threadId', type: 'string', description: 'Thread ID' },
      { name: 'subject', type: 'string', description: 'Email subject' },
      { name: 'sender', type: 'string', description: 'Sender name' },
      { name: 'senderEmail', type: 'string', description: 'Sender email address' },
      { name: 'status', type: 'string', default: 'pending', enum: ['pending', 'processed', 'actionable', 'archived', 'ignored'], description: 'Email status' },
      { name: 'actionType', type: 'string', description: 'Type of action taken' },
      { name: 'notes', type: 'string', description: 'Processing notes' },
    ],
  },

  output: {
    type: 'json',
  },

  mcp: {
    toolName: 'state_email_add',
  },
});
