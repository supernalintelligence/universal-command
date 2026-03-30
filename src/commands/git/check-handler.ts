/**
 * Git Check Handler - Universal Command Implementation
 *
 * Wraps existing repository context check logic
 */

import { ExecutionContext } from '../../types';
import { CommandError } from '../../errors';

// Import existing implementation
const { handleCheck } = require('../../../../../supernal-code-package/lib/cli/commands/git/git-check');

export interface CheckInput {
  verbose?: boolean;
}

export interface CheckOutput {
  success: boolean;
  branch?: string;
  status?: string;
  uncommittedChanges?: boolean;
  recentWork?: string[];
  message: string;
}

/**
 * Universal Command Handler for git check
 */
export async function handler(
  args: CheckInput,
  context: ExecutionContext
): Promise<CheckOutput> {
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
      await handleCheck([], {
        verbose: args.verbose || false,
      });

      return {
        success: true,
        message: 'Repository check completed',
      };
    } finally {
      // Restore console
      console.log = originalStdout;
      console.error = originalStderr;
    }
  } catch (error: any) {
    // Map to CommandError with appropriate exit code
    throw new CommandError(
      error.message || 'Repository check failed',
      {
        code: 'CHECK_FAILED',
        exitCode: 1,
        details: { error: error.message },
      }
    );
  }
}
