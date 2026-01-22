/**
 * Agent Assign Handler - Universal Command Wrapper
 */

import { ExecutionContext } from '../../types';
import { CommandError } from '../../errors';

const { AgentWorktreeManager } = require('../../../../../supernal-code-package/lib/lib/agent/AgentWorktreeManager');

export interface AgentAssignInput {
  name: string;
  requirement?: string;
}

export interface AgentAssignOutput {
  success: boolean;
  worktreePath: string;
  branchName: string;
  created: boolean;
  message: string;
}

export async function handler(
  args: AgentAssignInput,
  context: ExecutionContext
): Promise<AgentAssignOutput> {
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

      console.log(`\n🌿 Assigning to worktree: ${args.name}`);

      const result = await manager.assignToWorktree(args.name, args.requirement);

      console.log(`\n✅ Assignment complete!`);
      console.log(`   Worktree: ${result.worktreePath}`);
      console.log(`   Branch: ${result.branchName}`);
      console.log(`\n💡 To start working:`);
      console.log(`   cd ${result.worktreePath}`);
      console.log('');

      return {
        success: true,
        worktreePath: result.worktreePath,
        branchName: result.branchName,
        created: result.created || false,
        message: 'Assignment complete',
      };
    } finally {
      console.log = originalStdout;
      console.error = originalStderr;
    }
  } catch (error: any) {
    throw new CommandError(error.message || 'Agent assignment failed', {
      code: 'AGENT_ASSIGN_FAILED',
      exitCode: 1,
      details: { error: error.message },
    });
  }
}
