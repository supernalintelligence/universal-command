/**
 * Planning Req Validate Handler
 */

import { ExecutionContext } from '../../types';
import { CommandError } from '../../errors';

const { RequirementCommandHandler } = require('../../../../../supernal-code-package/lib/cli/commands/requirement/index');

export interface ReqValidateInput {
  requirementId: string;
  content?: boolean;
  naming?: boolean;
  all?: boolean;
  verbose?: boolean;
}

export interface ReqValidateOutput {
  success: boolean;
  requirementId?: string;
  valid?: boolean;
  errors?: any[];
  message: string;
}

export async function handler(
  args: ReqValidateInput,
  context: ExecutionContext
): Promise<ReqValidateOutput> {
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

      if (args.content) legacyArgs.push('--content');
      if (args.naming) legacyArgs.push('--naming');
      if (args.all) legacyArgs.push('--all');
      if (args.verbose) legacyArgs.push('--verbose');

      await handler.handleCommand('validate', ...legacyArgs);

      return {
        success: true,
        requirementId: args.requirementId,
        message: 'Validation completed',
      };
    } finally {
      console.log = originalStdout;
      console.error = originalStderr;
    }
  } catch (error: any) {
    throw new CommandError(error.message || 'Validation failed', {
      code: 'REQ_VALIDATE_FAILED',
      exitCode: 1,
      details: { error: error.message },
    });
  }
}
