/**
 * Git Merge Handler - Universal Command Implementation
 *
 * Wraps existing merge-safe.js logic for universal-command interface
 */

import { ExecutionContext } from '../../types';
import { CommandError } from '../../errors';

// Import existing implementation
const SafeMerge = require('../../../../../supernal-code-package/lib/cli/commands/git/merge-safe');

export interface MergeInput {
  branch?: string;
  autoPush?: boolean;
  push?: boolean;
  deleteLocal?: boolean;
  delete?: boolean;
  interactive?: boolean;
  i?: boolean;
  quiet?: boolean;
  q?: boolean;
  verbose?: boolean;
}

export interface MergeOutput {
  success: boolean;
  cancelled?: boolean;
  branchMerged?: string;
  requirement?: string;
  pushed?: boolean;
  message: string;
}

/**
 * Universal Command Handler for git merge
 */
export async function handler(
  args: MergeInput,
  context: ExecutionContext
): Promise<MergeOutput> {
  try {
    // Merge alias flags
    const autoPush = args.autoPush || args.push || false;
    const deleteLocal = args.deleteLocal || args.delete || false;
    const interactive = args.interactive || args.i || false;
    const quiet = args.quiet || args.q || false;
    const verbose = args.verbose === undefined ? !quiet : args.verbose;

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
      // Create instance and perform merge
      const safeMerge = new SafeMerge();
      const result = await safeMerge.performMerge({
        branch: args.branch || null,
        autoPush,
        deleteLocal,
        verbose,
        interactive,
      });

      // Return structured result
      return {
        success: result.success || false,
        cancelled: result.cancelled,
        branchMerged: result.branchMerged,
        requirement: result.requirement,
        pushed: autoPush && result.success,
        message: result.success
          ? 'Merge completed successfully'
          : result.cancelled
          ? 'Merge cancelled by user'
          : 'Merge failed',
      };
    } finally {
      // Restore console
      console.log = originalStdout;
      console.error = originalStderr;
    }
  } catch (error: any) {
    // Map to CommandError with appropriate exit code
    throw new CommandError(
      error.message || 'Merge failed',
      {
        code: 'MERGE_FAILED',
        exitCode: 1,
        details: { error: error.message },
      }
    );
  }
}
