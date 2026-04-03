/**
 * State Status Handler
 */

import { ExecutionContext } from '../../types';
import { AgentStateDB } from '@supernalintelligence/agent-tools';

export interface StateStatusInput {}

export interface StateStatusOutput {
  path: string;
  schemaVersion: number;
  emails: number;
  contacts: number;
  socialPosts: number;
  links: number;
  kvEntries: number;
}

export async function handler(
  args: StateStatusInput,
  context: ExecutionContext
): Promise<StateStatusOutput> {
  const db = new AgentStateDB();
  const stats = db.stats();
  db.close();
  return stats;
}
