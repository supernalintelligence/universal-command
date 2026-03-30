/**
 * Git Commit Handler - Universal Command Implementation
 *
 * Wraps existing git-commit.js logic for universal-command interface
 */

import { ExecutionContext } from '../../types';
import { CommandError } from '../../errors';

// Import existing implementation
const existingImpl = require('../../../../../supernal-code-package/lib/cli/commands/git/git-commit');

export interface CommitInput {
  files: string[];
  message?: string;
  filesOption?: string;
  nit?: boolean;
  fix?: boolean;
  recursive?: boolean;
  yes?: boolean;
  ai?: boolean;
  priority?: boolean;
  dryRun?: boolean;
  verbose?: boolean;
  auto?: boolean;
}

export interface CommitOutput {
  success: boolean;
  commitHash?: string;
  filesCommitted?: number;
  message: string;
  dryRun?: boolean;
}

/**
 * Universal Command Handler for git commit
 */
export async function handler(
  args: CommitInput,
  context: ExecutionContext
): Promise<CommitOutput> {
  try {
    // Map universal-command args to legacy format
    const options = {
      message: args.message,
      files: args.filesOption,
      nit: args.nit,
      fix: args.fix,
      recursive: args.recursive,
      yes: args.yes,
      ai: args.ai,
      priority: args.priority,
      dryRun: args.dryRun,
      verbose: args.verbose,
      auto: args.auto,
    };

    // Capture stdout/stderr if provided
    const originalStdout = console.log;
    const originalStderr = console.error;

    if (context.stdout) {
      console.log = (...args: any[]) => {
        const msg = args.map((a) => String(a)).join(' ') + '\n';
        context.stdout?.write(msg);
      };
    }

    if (context.stderr) {
      console.error = (...args: any[]) => {
        const msg = args.map((a) => String(a)).join(' ') + '\n';
        context.stderr?.write(msg);
      };
    }

    try {
      // Call existing implementation
      await existingImpl.handleCommit(args.files, options);

      // Success - parse result (existing impl writes to stdout, doesn't return structured data)
      return {
        success: true,
        message: 'Commit completed',
      };
    } finally {
      // Restore console
      console.log = originalStdout;
      console.error = originalStderr;
    }
  } catch (error: any) {
    // Map to CommandError with appropriate exit code
    throw new CommandError(
      error.message || 'Commit failed',
      {
        code: 'COMMIT_FAILED',
        exitCode: 1,
        details: { error: error.message },
      }
    );
  }
}
