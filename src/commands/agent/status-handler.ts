/**
 * Agent Status Handler - Universal Command Wrapper
 */

import { ExecutionContext } from '../../types';
import { CommandError } from '../../errors';

const {
  AgentWorktreeManager,
} = require('../../../../../supernal-code-package/lib/lib/agent/AgentWorktreeManager');

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface AgentStatusInput {
  // No parameters
}

export interface AgentStatusOutput {
  agent?: {
    name: string;
    sessionId?: string;
  };
  assignment?: {
    worktreeFeature: string;
    assignedAt: string;
    lastSeen: string;
  };
  context: {
    isWorktree: boolean;
    isMainBranch: boolean;
    shouldPrompt: boolean;
    suggestedName?: string;
  };
}

export async function handler(
  args: AgentStatusInput,
  context: ExecutionContext
): Promise<AgentStatusOutput> {
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

      // Print context banner
      await manager.printContextBanner();

      // Detect agent
      const agent = manager.detectCurrentAgent();
      const agentInfo = agent
        ? {
            name: agent.name,
            sessionId: agent.sessionId,
          }
        : undefined;

      if (agent) {
        console.log(`🤖 Detected Agent: ${agent.name}`);
        if (agent.sessionId) {
          console.log(`   Session: ${agent.sessionId.slice(0, 8)}...`);
        }
      } else {
        console.log('🤖 No agent detected (running as human)');
      }

      // Check assignment
      const assignment = await manager.getCurrentAssignment();
      if (assignment) {
        console.log(`\n📋 Current Assignment:`);
        console.log(`   Worktree: ${assignment.worktreeFeature}`);
        console.log(`   Assigned: ${assignment.assignedAt}`);
        console.log(`   Last seen: ${assignment.lastSeen}`);
      } else {
        console.log(`\n📋 No worktree assignment`);
      }

      // Check if should prompt for worktree
      const shouldPrompt = await manager.shouldPromptForWorktree();
      const contextInfo = {
        isWorktree: false, // Will be set by manager
        isMainBranch: shouldPrompt,
        shouldPrompt,
        suggestedName: shouldPrompt ? manager.getSuggestedWorktreeName() : undefined,
      };

      if (shouldPrompt) {
        console.log(`\n💡 You're on main branch. Consider creating a worktree:`);
        console.log(`   sc agent assign ${contextInfo.suggestedName}`);
      }

      console.log('');

      return {
        agent: agentInfo,
        assignment: assignment || undefined,
        context: contextInfo,
      };
    } finally {
      console.log = originalStdout;
      console.error = originalStderr;
    }
  } catch (error: any) {
    throw new CommandError(error.message || 'Agent status check failed', {
      code: 'AGENT_STATUS_FAILED',
      exitCode: 1,
      details: { error: error.message },
    });
  }
}
