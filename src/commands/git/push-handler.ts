/**
 * Git Push Handler - Universal Command Implementation
 *
 * Wraps existing auto-push logic from git-merge-worktree.js
 */

import { ExecutionContext } from '../../types';
import { CommandError } from '../../errors';

// Import existing implementation
const { autoPushUpstream } = require('../../../../../supernal-code-package/lib/cli/commands/git/git-merge-worktree');

export interface PushInput {
  verbose?: boolean;
}

export interface PushOutput {
  success: boolean;
  branch?: string;
  commitsPushed?: number;
  message: string;
}

/**
 * Universal Command Handler for git push
 */
export async function handler(
  args: PushInput,
  context: ExecutionContext
): Promise<PushOutput> {
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
      // Call existing implementation
      const result = await autoPushUpstream({
        verbose: args.verbose ?? true,
      });

      return {
        success: result.success || false,
        branch: result.branch,
        commitsPushed: result.commitsPushed || 0,
        message: result.message || (result.success ? 'Push completed' : 'Push failed'),
      };
    } finally {
      // Restore console
      console.log = originalStdout;
      console.error = originalStderr;
    }
  } catch (error: any) {
    // Map to CommandError with appropriate exit code
    throw new CommandError(
      error.message || 'Push failed',
      {
        code: 'PUSH_FAILED',
        exitCode: 1,
        details: { error: error.message },
      }
    );
  }
}
