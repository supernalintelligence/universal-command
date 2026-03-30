/**
 * Workflow WIP Register Handler - Universal Command Wrapper
 */

import { ExecutionContext } from '../../types';
import { CommandError } from '../../errors';

const WipManager = require('../../../../../supernal-code-package/lib/wip/WipManager');

export interface WipRegisterInput {
  file: string;
  feature: string;
  requirement: string;
  reason?: string;
  notes?: string;
  userid?: string;
  addComment?: boolean;
  autoCleanup?: boolean;
}

export interface WipRegisterOutput {
  success: boolean;
  file: string;
  feature: string;
  requirement: string;
  userid: string;
  reason: string;
}

export async function handler(
  args: WipRegisterInput,
  context: ExecutionContext
): Promise<WipRegisterOutput> {
  try {
    const originalStdout = console.log;
    const originalStderr = console.error;

    // Capture console output
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

      const entry = await manager.register(args.file, {
        feature: args.feature,
        requirement: args.requirement,
        reason: args.reason || 'Work in progress',
        notes: args.notes,
        userid: args.userid,
        addComment: args.addComment,
        autoCleanup: args.autoCleanup !== false,
      });

      console.log(`✅ Registered in WIP registry: ${args.file}`);
      console.log(`   Feature: ${entry.feature}`);
      console.log(`   Requirement: ${entry.requirement}`);
      console.log(`   User: @${entry.userid}`);
      console.log(`   Reason: ${entry.reason}`);

      return {
        success: true,
        file: args.file,
        feature: entry.feature,
        requirement: entry.requirement,
        userid: entry.userid,
        reason: entry.reason,
      };
    } finally {
      console.log = originalStdout;
      console.error = originalStderr;
    }
  } catch (error: any) {
    throw new CommandError(error.message || 'WIP registration failed', {
      code: 'WIP_REGISTER_FAILED',
      exitCode: 1,
      details: { error: error.message },
    });
  }
}
