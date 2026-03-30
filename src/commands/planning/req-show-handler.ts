/**
 * Planning Req Show Handler
 */

import { ExecutionContext } from '../../types';
import { CommandError } from '../../errors';

const { RequirementCommandHandler } = require('../../../../../supernal-code-package/lib/cli/commands/requirement/index');

export interface ReqShowInput {
  requirementId: string;
  format?: string;
  verbose?: boolean;
}

export interface ReqShowOutput {
  success: boolean;
  requirementId?: string;
  content?: string;
  message: string;
}

export async function handler(
  args: ReqShowInput,
  context: ExecutionContext
): Promise<ReqShowOutput> {
  try {
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
      const handler = new RequirementCommandHandler();
      const legacyArgs = [args.requirementId];

      if (args.format) legacyArgs.push(`--format=${args.format}`);
      if (args.verbose) legacyArgs.push('--verbose');

      await handler.handleCommand('show', ...legacyArgs);

      return {
        success: true,
        requirementId: args.requirementId,
        message: 'Requirement displayed successfully',
      };
    } finally {
      console.log = originalStdout;
      console.error = originalStderr;
    }
  } catch (error: any) {
    throw new CommandError(error.message || 'Show failed', {
      code: 'REQ_SHOW_FAILED',
      exitCode: 1,
      details: { error: error.message },
    });
  }
}
