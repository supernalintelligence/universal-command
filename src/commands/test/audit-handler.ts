/**
 * Test Audit Handler - Universal Command Wrapper
 */

import { ExecutionContext } from '../../types';
import { CommandError } from '../../errors';

const { auditTraceability } = require('../../../../../supernal-code-package/lib/cli/commands/test/testing/audit-traceability');
const { auditCommand } = require('../../../../../supernal-code-package/lib/cli/commands/development/audit');

export interface TestAuditInput {
  action?: string;
  fix?: boolean;
  dryRun?: boolean;
  cosmetic?: boolean;
  verbose?: boolean;
  format?: string;
  output?: string;
  skipped?: boolean;
}

export interface TestAuditOutput {
  success: boolean;
  action?: string;
  issues?: any[];
  fixed?: number;
  message: string;
}

export async function handler(
  args: TestAuditInput,
  context: ExecutionContext
): Promise<TestAuditOutput> {
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
      const resolvedAction = args.skipped ? 'skipped-tests' : (args.action || 'traceability');

      // For 'traceability' action, use existing function
      if (resolvedAction === 'traceability') {
        const legacyOptions = {
          fix: args.fix,
          dryRun: args.dryRun,
          verbose: args.verbose,
          format: args.format,
          output: args.output,
        };

        await auditTraceability(legacyOptions);

        return {
          success: true,
          action: 'traceability',
          message: 'Traceability audit completed',
        };
      }

      // For other actions, delegate to the development/audit module
      const actionMap: Record<string, string> = {
        'cli-tests': 'cli-tests',
        'cli': 'cli-tests',
        'requirements': 'requirements',
        'req': 'requirements',
        'req-trace': 'requirements',
        'skipped': 'skipped-tests',
        'skipped-tests': 'skipped-tests',
        'test-requirements': 'test-requirements',
        'linkage': 'test-requirements',
        'all': 'all',
      };

      const mappedAction = actionMap[resolvedAction] || resolvedAction;

      const legacyOptions = {
        fix: args.fix,
        dryRun: args.dryRun,
        cosmetic: args.cosmetic,
        verbose: args.verbose,
        format: args.format,
        output: args.output,
      };

      await auditCommand(mappedAction, legacyOptions);

      return {
        success: true,
        action: mappedAction,
        message: `Audit completed for ${mappedAction}`,
      };
    } finally {
      console.log = originalStdout;
      console.error = originalStderr;
    }
  } catch (error: any) {
    throw new CommandError(error.message || 'Test audit failed', {
      code: 'TEST_AUDIT_FAILED',
      exitCode: 1,
      details: { error: error.message },
    });
  }
}
