/**
 * Workflow WIP Status Handler - Universal Command Wrapper
 */

import { ExecutionContext } from '../../types';
import { CommandError } from '../../errors';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const WipManager = require('../../../../../supernal-code-package/lib/wip/WipManager');

export interface WipStatusInput {
  // No parameters
}

export interface WipStatusOutput {
  success: boolean;
  status: {
    total: number;
    active: number;
    old: number;
    warnDays: number;
  };
  statsByUser: Record<string, { total: number; old: number }>;
}

export async function handler(
  args: WipStatusInput,
  context: ExecutionContext
): Promise<WipStatusOutput> {
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
      const status = await manager.status();
      const stats = await manager.getStatsByUser();

      console.log('\nWIP Registry Status:');
      console.log('─'.repeat(80));
      console.log(`Total files: ${status.total}`);
      console.log(`Active (< ${status.warnDays} days): ${status.active}`);
      console.log(`Old (> ${status.warnDays} days): ${status.old}`);

      console.log('\nBy User:');
      for (const [user, userStats] of Object.entries(stats) as [
        string,
        { total: number; old: number },
      ][]) {
        console.log(
          `  @${user}: ${userStats.total} files${userStats.old > 0 ? ` (${userStats.old} old)` : ''}`
        );
      }

      if (status.old > 0) {
        console.log('\n⚠️  Old files need attention:');
        for (const file of status.oldFiles) {
          const userStr = file.userid ? `@${file.userid}` : 'Unassigned';
          console.log(
            `  ${file.path} (${file.age} days old) - Feature: ${file.feature} - User: ${userStr}`
          );
        }
        console.log('\nConsider:');
        console.log('  - Committing them if ready');
        console.log('  - Removing them if not needed');
        console.log('  - Touching them if still working: sc workflow wip touch <file>');
      } else {
        console.log('\n✅ All files are active');
      }

      return {
        success: true,
        status: {
          total: status.total,
          active: status.active,
          old: status.old,
          warnDays: status.warnDays,
        },
        statsByUser: stats,
      };
    } finally {
      console.log = originalStdout;
      console.error = originalStderr;
    }
  } catch (error: any) {
    throw new CommandError(error.message || 'WIP status failed', {
      code: 'WIP_STATUS_FAILED',
      exitCode: 1,
      details: { error: error.message },
    });
  }
}
