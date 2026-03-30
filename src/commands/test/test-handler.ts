/**
 * Test Handler - Universal Command Wrapper
 */

import { ExecutionContext } from '../../types';
import { CommandError } from '../../errors';

const { TestCommand } = require('../../../../../supernal-code-package/lib/cli/commands/test/testing/test-command');

export interface TestInput {
  action?: string;
  target?: string;
  watch?: boolean;
  coverage?: boolean;
  verbose?: boolean;
  req?: string;
  feature?: string;
  compliance?: boolean;
  evidence?: boolean;
  since?: string;
  format?: string;
  noAutoCommit?: boolean;
}

export interface TestOutput {
  success: boolean;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  resultId?: string;
  duration_ms?: number;
}

export async function handler(
  args: TestInput,
  context: ExecutionContext
): Promise<TestOutput> {
  try {
    const originalStdout = console.log;
    const originalStderr = console.error;

    let stdoutBuffer = '';
    let stderrBuffer = '';

    if (context.stdout) {
      console.log = (...logArgs: any[]) => {
        const msg = logArgs.map((a) => String(a)).join(' ') + '\n';
        stdoutBuffer += msg;
        context.stdout?.write(msg);
      };
    }

    if (context.stderr) {
      console.error = (...logArgs: any[]) => {
        const msg = logArgs.map((a) => String(a)).join(' ') + '\n';
        stderrBuffer += msg;
        context.stderr?.write(msg);
      };
    }

    try {
      const testCmd = new TestCommand();

      // Convert args to legacy format
      const legacyOptions = {
        watch: args.watch,
        coverage: args.coverage,
        verbose: args.verbose,
        req: args.req,
        feature: args.feature,
        compliance: args.compliance || args.evidence,
        since: args.since,
        format: args.format,
        noAutoCommit: args.noAutoCommit,
      };

      // Execute with proper context
      await testCmd.execute(
        args.action || 'help',
        args.target,
        legacyOptions,
        [] // extraArgs
      );

      return {
        success: true,
        exitCode: 0,
        stdout: stdoutBuffer,
        stderr: stderrBuffer,
      };
    } finally {
      console.log = originalStdout;
      console.error = originalStderr;
    }
  } catch (error: any) {
    throw new CommandError(error.message || 'Test execution failed', {
      code: 'TEST_FAILED',
      exitCode: error.exitCode || 1,
      details: { error: error.message },
    });
  }
}
