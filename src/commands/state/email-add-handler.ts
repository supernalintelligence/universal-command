/**
 * Email Add Handler
 */

import { ExecutionContext } from '../../types';
import { AgentStateDB, EmailStore, type EmailStatus } from '@supernalintelligence/agent-tools';

export interface EmailAddInput {
  id: string;
  threadId?: string;
  subject?: string;
  sender?: string;
  senderEmail?: string;
  status?: EmailStatus;
  actionType?: string;
  notes?: string;
}

export async function handler(
  args: EmailAddInput,
  context: ExecutionContext
) {
  const db = new AgentStateDB();
  const emails = new EmailStore(db);
  
  const email = emails.upsert({
    id: args.id,
    thread_id: args.threadId,
    subject: args.subject,
    sender: args.sender,
    sender_email: args.senderEmail,
    status: args.status || 'pending',
    action_type: args.actionType,
    notes: args.notes,
  });
  
  db.close();
  return email;
}
