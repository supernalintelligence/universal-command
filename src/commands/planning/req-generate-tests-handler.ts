/**
 * Planning Req Generate Tests Handler
 */

import { ExecutionContext } from '../../types';
import { CommandError } from '../../errors';

const { RequirementCommandHandler } = require('../../../../../supernal-code-package/lib/cli/commands/requirement/index');

export interface ReqGenerateTestsInput {
  requirementId: string;
  dryRun?: boolean;
  yes?: boolean;
  verbose?: boolean;
}

export interface ReqGenerateTestsOutput {
  success: boolean;
  requirementId?: string;
  testsGenerated?: number;
  filePaths?: string[];
  message: string;
}

export async function handler(
  args: ReqGenerateTestsInput,
  context: ExecutionContext
): Promise<ReqGenerateTestsOutput> {
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

      if (args.dryRun) legacyArgs.push('--dry-run');
      if (args.yes) legacyArgs.push('--yes');
      if (args.verbose) legacyArgs.push('--verbose');

      await handler.handleCommand('generate-tests', ...legacyArgs);

      return {
        success: true,
        requirementId: args.requirementId,
        message: 'Tests generated successfully',
      };
    } finally {
      console.log = originalStdout;
      console.error = originalStderr;
    }
  } catch (error: any) {
    throw new CommandError(error.message || 'Test generation failed', {
      code: 'REQ_GENERATE_TESTS_FAILED',
      exitCode: 1,
      details: { error: error.message },
    });
  }
}
