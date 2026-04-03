/**
 * Email Check Handler
 */

import { ExecutionContext } from '../../types';
import { AgentStateDB, EmailStore } from '@supernalintelligence/agent-tools';

export interface EmailCheckInput {
  id: string;
}

export interface EmailCheckOutput {
  exists: boolean;
  id: string;
}

export async function handler(
  args: EmailCheckInput,
  context: ExecutionContext
): Promise<EmailCheckOutput> {
  const db = new AgentStateDB();
  const emails = new EmailStore(db);
  const exists = emails.exists(args.id);
  db.close();
  
  // For CLI, exit code 0 = exists, 1 = not found
  if (context.interface === 'cli' && !exists) {
    process.exitCode = 1;
  }
  
  return { exists, id: args.id };
}
