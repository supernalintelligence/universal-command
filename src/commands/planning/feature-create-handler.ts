/**
 * Planning Feature Create Handler - Universal Command Wrapper
 */

import { ExecutionContext } from '../../types';
import { CommandError } from '../../errors';

const { createFeature } = require('../../../../../supernal-code-package/lib/cli/commands/planning/feature/create');

export interface FeatureCreateInput {
  id: string;
  title?: string;
  domain: string;
  epic?: string;
  priority?: string;
  assignee?: string;
  minimal?: boolean;
}

export interface FeatureCreateOutput {
  success: boolean;
  featurePath: string;
  message: string;
}

export async function handler(
  args: FeatureCreateInput,
  context: ExecutionContext
): Promise<FeatureCreateOutput> {
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
      // Call legacy create function
      await createFeature({
        id: args.id,
        title: args.title || args.id,
        domain: args.domain,
        epic: args.epic,
        priority: args.priority || 'medium',
        assignee: args.assignee,
        minimal: args.minimal || false,
      });

      return {
        success: true,
        featurePath: `docs/features/${args.domain}/${args.id}`,
        message: 'Feature created successfully',
      };
    } finally {
      console.log = originalStdout;
      console.error = originalStderr;
    }
  } catch (error: any) {
    throw new CommandError(error.message || 'Feature creation failed', {
      code: 'FEATURE_CREATE_FAILED',
      exitCode: 1,
      details: { error: error.message },
    });
  }
}
