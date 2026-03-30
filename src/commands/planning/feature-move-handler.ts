/**
 * Planning Feature Move Handler - Universal Command Wrapper
 */

import { ExecutionContext } from '../../types';
import { CommandError } from '../../errors';

const { moveFeatureCommand } = require('../../../../../supernal-code-package/lib/cli/commands/planning/feature/move');

export interface FeatureMoveInput {
  featureId: string;
  targetDomain: string;
}

export interface FeatureMoveOutput {
  success: boolean;
  from: string;
  to: string;
  message: string;
}

export async function handler(
  args: FeatureMoveInput,
  context: ExecutionContext
): Promise<FeatureMoveOutput> {
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
      // Call legacy move function
      await moveFeatureCommand(args.featureId, args.targetDomain, {
        projectRoot: process.cwd(),
      });

      return {
        success: true,
        from: 'unknown', // Not available from legacy
        to: args.targetDomain,
        message: `Feature ${args.featureId} moved to ${args.targetDomain}`,
      };
    } finally {
      console.log = originalStdout;
      console.error = originalStderr;
    }
  } catch (error: any) {
    throw new CommandError(error.message || 'Feature move failed', {
      code: 'FEATURE_MOVE_FAILED',
      exitCode: 1,
      details: { error: error.message },
    });
  }
}
