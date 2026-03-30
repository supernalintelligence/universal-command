/**
 * Workflow WIP Cleanup Handler - Universal Command Wrapper
 */

import { ExecutionContext } from '../../types';
import { CommandError } from '../../errors';

const WipManager = require('../../../../../supernal-code-package/lib/wip/WipManager');

export interface WipCleanupInput {
  olderThan?: string;
  dryRun?: boolean;
  force?: boolean;
}

export interface WipCleanupOutput {
  success: boolean;
  cleaned: number;
  message: string;
}

export async function handler(
  args: WipCleanupInput,
  context: ExecutionContext
): Promise<WipCleanupOutput> {
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
      const manager = new WipManager();

      const result = await manager.cleanup({
        olderThan: (args.olderThan || '7d').replace('d', ''),
        dryRun: args.dryRun,
        force: args.force,
      });

      if (result.cleaned === 0) {
        console.log(`✅ ${result.message}`);
      } else {
        console.log(`✅ Cleaned ${result.cleaned} file(s)`);
        if (args.dryRun) {
          console.log('\n(Dry run - no changes made)');
        }
      }

      return {
        success: true,
        cleaned: result.cleaned,
        message: result.message || `Cleaned ${result.cleaned} files`,
      };
    } finally {
      console.log = originalStdout;
      console.error = originalStderr;
    }
  } catch (error: any) {
    throw new CommandError(error.message || 'WIP cleanup failed', {
      code: 'WIP_CLEANUP_FAILED',
      exitCode: 1,
      details: { error: error.message },
    });
  }
}
