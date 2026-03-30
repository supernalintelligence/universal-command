/**
 * Workflow WIP Unregister Handler - Universal Command Wrapper
 */

import { ExecutionContext } from '../../types';
import { CommandError } from '../../errors';

const WipManager = require('../../../../../supernal-code-package/lib/wip/WipManager');

export interface WipUnregisterInput {
  file: string;
  quiet?: boolean;
}

export interface WipUnregisterOutput {
  success: boolean;
  removed: boolean;
  message: string;
}

export async function handler(
  args: WipUnregisterInput,
  context: ExecutionContext
): Promise<WipUnregisterOutput> {
  try {
    const originalStdout = console.log;
    const originalStderr = console.error;

    if (context.stdout && !args.quiet) {
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
      const result = await manager.unregister(args.file, { quiet: args.quiet });

      if (!args.quiet) {
        if (result.removed) {
          console.log(`✅ De-registered from WIP registry: ${args.file}`);
        } else {
          console.log(`⚠️ ${result.message || `File not in WIP registry: ${args.file}`}`);
        }
      }

      return {
        success: true,
        removed: result.removed,
        message: result.message || (result.removed ? 'File unregistered' : 'File not in registry'),
      };
    } finally {
      console.log = originalStdout;
      console.error = originalStderr;
    }
  } catch (error: any) {
    throw new CommandError(error.message || 'WIP unregister failed', {
      code: 'WIP_UNREGISTER_FAILED',
      exitCode: 1,
      details: { error: error.message },
    });
  }
}
