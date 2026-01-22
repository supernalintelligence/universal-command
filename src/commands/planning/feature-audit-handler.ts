/**
 * Planning Feature Audit Handler - Universal Command Wrapper
 */

import { ExecutionContext } from '../../types';
import { CommandError } from '../../errors';

const { auditFeatures } = require('../../../../../supernal-code-package/lib/cli/commands/planning/feature/audit');

export interface FeatureAuditInput {
  featureId?: string;
  verbose?: boolean;
  fix?: boolean;
  commit?: boolean;
}

export interface FeatureAuditOutput {
  success: boolean;
  audited: number;
  issues: number;
  fixed: number;
}

export async function handler(
  args: FeatureAuditInput,
  context: ExecutionContext
): Promise<FeatureAuditOutput> {
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
      // Call legacy audit function
      await auditFeatures(args.featureId, {
        verbose: args.verbose,
        fix: args.fix,
        commit: args.commit,
      });

      // Note: The legacy function doesn't return structured data,
      // so we return a success indicator
      return {
        success: true,
        audited: 0, // Not available from legacy
        issues: 0, // Not available from legacy
        fixed: 0, // Not available from legacy
      };
    } finally {
      console.log = originalStdout;
      console.error = originalStderr;
    }
  } catch (error: any) {
    throw new CommandError(error.message || 'Feature audit failed', {
      code: 'FEATURE_AUDIT_FAILED',
      exitCode: 1,
      details: { error: error.message },
    });
  }
}
