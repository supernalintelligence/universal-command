/**
 * Modal Spawn Handler - Universal Command Wrapper
 */

import { ExecutionContext } from '../../types';
import { CommandError } from '../../errors';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ModalSpawnInput {
  task: string;
  agent?: string;
  repo?: string;
}

export interface ModalSpawnOutput {
  agentId: string;
  task: string;
  repo?: string;
  success: boolean;
  output: string;
}

export async function handler(
  args: ModalSpawnInput,
  context: ExecutionContext
): Promise<ModalSpawnOutput> {
  try {
    const { task, agent = 'worker', repo } = args;
    
    // Build command
    let command = `modal-spawn`;
    if (agent && agent !== 'worker') {
      command += ` --agent "${agent}"`;
    }
    if (repo) {
      command += ` --repo "${repo}"`;
    }
    command += ` "${task}"`;

    // Execute command
    context.stdout?.write(`🚀 Spawning Modal agent '${agent}'...\n`);
    context.stdout?.write(`📝 Task: ${task}\n`);
    if (repo) {
      context.stdout?.write(`📂 Workspace: ${repo}\n`);
    }
    context.stdout?.write('\n');

    const { stdout, stderr } = await execAsync(command, {
      timeout: 300000, // 5 minute timeout
    });

    const output = stdout + (stderr ? '\n' + stderr : '');
    
    context.stdout?.write(output);
    
    return {
      agentId: agent,
      task,
      repo,
      success: true,
      output,
    };
  } catch (error: any) {
    const errorMessage = error.stderr || error.message || 'Modal spawn failed';
    
    context.stderr?.write(`❌ Modal spawn error: ${errorMessage}\n`);
    
    throw new CommandError(errorMessage, {
      code: 'MODAL_SPAWN_FAILED',
      exitCode: error.code || 1,
      details: { 
        error: errorMessage,
        agent: args.agent || 'worker',
        task: args.task,
      },
    });
  }
}