/**
 * Modal Status Handler - Universal Command Wrapper
 */

import { ExecutionContext } from '../../types';
import { CommandError } from '../../errors';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ModalStatusInput {
  user?: string;
}

export interface ModalStatusOutput {
  profile: string;
  deployments: string[];
  secrets: string[];
  user?: string;
  success: boolean;
  output: string;
}

export async function handler(
  args: ModalStatusInput,
  context: ExecutionContext
): Promise<ModalStatusOutput> {
  try {
    const { user } = args;
    
    // Execute modal-manage status
    const command = 'modal-manage status';

    context.stdout?.write(`📊 Modal Status\n`);
    if (user) {
      context.stdout?.write(`   User: ${user}\n`);
    }
    context.stdout?.write('\n');

    const { stdout, stderr } = await execAsync(command, {
      timeout: 60000, // 1 minute timeout
    });

    const output = stdout + (stderr ? '\n' + stderr : '');
    
    // Parse output to extract structured data
    let profile = '';
    let deployments: string[] = [];
    let secrets: string[] = [];
    
    const lines = output.split('\n');
    let section = '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      if (trimmed.startsWith('Profile:')) {
        section = 'profile';
      } else if (trimmed.startsWith('Deployments:')) {
        section = 'deployments';
      } else if (trimmed.startsWith('Secrets:')) {
        section = 'secrets';
      } else if (section === 'profile' && trimmed.includes('@')) {
        profile = trimmed;
      } else if (section === 'deployments' && !trimmed.startsWith('No deployments')) {
        if (!trimmed.includes('NAME') && trimmed.length > 0) {
          deployments.push(trimmed);
        }
      } else if (section === 'secrets' && trimmed.length > 0) {
        if (!trimmed.includes('NAME') && trimmed.length > 0) {
          secrets.push(trimmed);
        }
      }
    }
    
    context.stdout?.write(output);
    
    return {
      profile,
      deployments,
      secrets,
      user,
      success: true,
      output,
    };
  } catch (error: any) {
    const errorMessage = error.stderr || error.message || 'Modal status check failed';
    
    context.stderr?.write(`❌ Modal status error: ${errorMessage}\n`);
    
    throw new CommandError(errorMessage, {
      code: 'MODAL_STATUS_FAILED',
      exitCode: error.code || 1,
      details: { 
        error: errorMessage,
        user: args.user,
      },
    });
  }
}