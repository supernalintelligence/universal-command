/**
 * Git Branch Handler - Universal Command Implementation
 *
 * Wraps existing session branch management logic
 */

import { ExecutionContext } from '../../types';
import { CommandError } from '../../errors';

// Import existing implementation
const { handleBranchCommand } = require('../../../../../supernal-code-package/lib/cli/commands/branch/index');

export interface BranchInput {
  action?: string;
  base?: string;
  reconcile?: string;
  notes?: string;
  push?: boolean;
  pr?: boolean;
  user?: string;
  active?: boolean;
}

export interface BranchOutput {
  success: boolean;
  action?: string;
  sessionId?: string;
  branch?: string;
  message: string;
}

/**
 * Universal Command Handler for git branch
 */
export async function handler(
  args: BranchInput,
  context: ExecutionContext
): Promise<BranchOutput> {
  try {
    // Capture stdout/stderr if provided
    const originalStdout = console.log;
    const originalStderr = console.error;

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
      const action = args.action || 'status';

      // Call existing implementation
      await handleBranchCommand(action, {
        base: args.base,
        reconcile: args.reconcile,
        notes: args.notes,
        push: args.push,
        pr: args.pr,
        user: args.user,
        active: args.active,
      });

      return {
        success: true,
        action,
        message: `Branch ${action} completed`,
      };
    } finally {
      // Restore console
      console.log = originalStdout;
      console.error = originalStderr;
    }
  } catch (error: any) {
    // Map to CommandError with appropriate exit code
    throw new CommandError(
      error.message || 'Branch operation failed',
      {
        code: 'BRANCH_FAILED',
        exitCode: 1,
        details: { error: error.message },
      }
    );
  }
}
