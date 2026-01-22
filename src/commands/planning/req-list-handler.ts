/**
 * Planning Req List Handler - Universal Command Implementation
 */

import { ExecutionContext } from '../../types';
import { CommandError } from '../../errors';

const { RequirementCommandHandler } = require('../../../../../supernal-code-package/lib/cli/commands/requirement/index');

export interface ReqListInput {
  format?: string;
  epic?: string;
  category?: string;
  priority?: string;
  status?: string;
  feature?: string;
  verbose?: boolean;
}

export interface ReqListOutput {
  success: boolean;
  requirements?: any[];
  count?: number;
  message: string;
}

export async function handler(
  args: ReqListInput,
  context: ExecutionContext
): Promise<ReqListOutput> {
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
      const legacyArgs: string[] = [];

      if (args.format) legacyArgs.push(`--format=${args.format}`);
      if (args.epic) legacyArgs.push(`--epic=${args.epic}`);
      if (args.category) legacyArgs.push(`--category=${args.category}`);
      if (args.priority) legacyArgs.push(`--priority=${args.priority}`);
      if (args.status) legacyArgs.push(`--status=${args.status}`);
      if (args.feature) legacyArgs.push(`--feature=${args.feature}`);
      if (args.verbose) legacyArgs.push('--verbose');

      await handler.handleCommand('list', ...legacyArgs);

      return {
        success: true,
        message: 'Requirements listed successfully',
      };
    } finally {
      console.log = originalStdout;
      console.error = originalStderr;
    }
  } catch (error: any) {
    throw new CommandError(error.message || 'List failed', {
      code: 'REQ_LIST_FAILED',
      exitCode: 1,
      details: { error: error.message },
    });
  }
}
