/**
 * Agent Unassign Handler - Universal Command Wrapper
 */

import { ExecutionContext } from '../../types';
import { CommandError } from '../../errors';

const { AgentWorktreeManager } = require('../../../../../supernal-code-package/lib/lib/agent/AgentWorktreeManager');

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

      // Handle removal if requested
      let removed = false;
      if (args.remove && !args.keep) {
        // Note: The legacy implementation doesn't support --remove directly
        // This would require calling the cleanup logic with --self
        // For now, we just unassign and let the user manually cleanup
        console.log('💡 To remove the worktree, use: sc agent cleanup --self');
      }

      return {
        success: true,
        removed,
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
