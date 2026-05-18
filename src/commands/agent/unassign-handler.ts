/**
 * Agent Unassign Handler - Universal Command Wrapper
 */

import { ExecutionContext } from '../../types';
import { CommandError } from '../../errors';

const {
  AgentWorktreeManager,
} = require('../../../../../supernal-code-package/lib/lib/agent/AgentWorktreeManager');

export interface AgentUnassignInput {
  remove?: boolean;
  keep?: boolean;
}

export interface AgentUnassignOutput {
  success: boolean;
  removed: boolean;
  message: string;
}

export async function handler(
  args: AgentUnassignInput,
  context: ExecutionContext
): Promise<AgentUnassignOutput> {
  try {
    const originalStdout = console.log;
    const originalStderr = console.error;

    // Capture console output if context streams provided
    if (context.stdout) {
      console.log = (...logArgs: any[]) => {
        const msg = logArgs.map((a) => String(a)).join(' ') + '\n';
        context.stdout?.write(msg);
      };
    }

    if (context.stderr) {
      console.error = (...logArgs: any[]) => {
        const msg = logArgs.map((a) => String(a)).join(' ') + '\n';
        context.stderr?.write(msg);
      };
    }

    try {
      const manager = new AgentWorktreeManager(process.cwd());

      // Unassign from worktree
      await manager.unassign();

      console.log('✅ Unassigned from worktree');

      // Note: --remove is not yet implemented; use sc agent cleanup --self
      if (args.remove && !args.keep) {
        console.log('💡 To remove the worktree, use: sc agent cleanup --self');
      }

      return {
        success: true,
        removed: false,
        message: 'Unassigned from worktree',
      };
    } finally {
      console.log = originalStdout;
      console.error = originalStderr;
    }
  } catch (error: any) {
    throw new CommandError(error.message || 'Agent unassign failed', {
      code: 'AGENT_UNASSIGN_FAILED',
      exitCode: 1,
      details: { error: error.message },
    });
  }
}
