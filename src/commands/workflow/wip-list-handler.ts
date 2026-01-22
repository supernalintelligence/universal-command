/**
 * Workflow WIP List Handler - Universal Command Wrapper
 */

import { ExecutionContext } from '../../types';
import { CommandError } from '../../errors';

const WipManager = require('../../../../../supernal-code-package/lib/wip/WipManager');

export interface WipListInput {
  olderThan?: string;
  userid?: string;
  me?: boolean;
  unassigned?: boolean;
  pathsOnly?: boolean;
}

export interface WipListOutput {
  success: boolean;
  files: Array<{
    path: string;
    feature: string;
    requirement: string;
    userid?: string;
    reason: string;
    last_modified: string;
  }>;
  count: number;
}

export async function handler(
  args: WipListInput,
  context: ExecutionContext
): Promise<WipListOutput> {
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
      const files = await manager.list({
        olderThan: args.olderThan ? args.olderThan.replace('d', '') : null,
        userid: args.userid,
        me: args.me,
        unassigned: args.unassigned,
        pathsOnly: args.pathsOnly,
      });

      if (args.pathsOnly) {
        files.forEach((p: string) => console.log(p));
      } else {
        if (files.length === 0) {
          console.log('✅ No WIP-tracked files');
        } else {
          console.log('\nWIP-Tracked Files:');
          console.log('─'.repeat(80));

          for (const file of files) {
            const age = Math.floor(
              (Date.now() - new Date(file.last_modified).getTime()) / (1000 * 60 * 60 * 24)
            );
            const ageStr = age > 0 ? `${age}d ago` : 'today';
            const userStr = file.userid ? `@${file.userid}` : 'unassigned';

            console.log(file.path);
            console.log(`  Feature: ${file.feature} | Requirement: ${file.requirement} | User: ${userStr}`);
            console.log(`  Reason: ${file.reason} | Modified: ${ageStr}`);
            if (age > 3) {
              console.log(`  ⚠️  OLD - Consider committing or removing`);
            }
            console.log();
          }
        }
      }

      return {
        success: true,
        files: files,
        count: files.length,
      };
    } finally {
      console.log = originalStdout;
      console.error = originalStderr;
    }
  } catch (error: any) {
    throw new CommandError(error.message || 'WIP list failed', {
      code: 'WIP_LIST_FAILED',
      exitCode: 1,
      details: { error: error.message },
    });
  }
}
