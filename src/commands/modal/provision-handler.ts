/**
 * Modal Provision Handler - Universal Command Wrapper
 */

import { ExecutionContext } from '../../types';
import { CommandError } from '../../errors';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ModalProvisionInput {
  userId: string;
  email: string;
  org?: string;
}

export interface ModalProvisionOutput {
  userId: string;
  email: string;
  org: string;
  workspacePath?: string;
  success: boolean;
  output: string;
}

export async function handler(
  args: ModalProvisionInput,
  context: ExecutionContext
): Promise<ModalProvisionOutput> {
  try {
    const { userId, email, org = 'default' } = args;
    
    // Build command
    let command = `modal-onboard "${userId}" "${email}"`;
    if (org !== 'default') {
      command += ` --org "${org}"`;
    }

    // Execute command
    context.stdout?.write(`🚀 Provisioning Modal workspace...\n`);
    context.stdout?.write(`   User ID: ${userId}\n`);
    context.stdout?.write(`   Email: ${email}\n`);
    context.stdout?.write(`   Org: ${org}\n`);
    context.stdout?.write('\n');

    const { stdout, stderr } = await execAsync(command, {
      timeout: 300000, // 5 minute timeout
    });

    const output = stdout + (stderr ? '\n' + stderr : '');
    
    // Try to extract workspace path from output
    const workspaceMatch = output.match(/Workspace location: (.+)/);
    const workspacePath = workspaceMatch ? workspaceMatch[1] : undefined;
    
    context.stdout?.write(output);
    
    return {
      userId,
      email,
      org,
      workspacePath,
      success: true,
      output,
    };
  } catch (error: any) {
    const errorMessage = error.stderr || error.message || 'Modal provision failed';
    
    context.stderr?.write(`❌ Modal provision error: ${errorMessage}\n`);
    
    throw new CommandError(errorMessage, {
      code: 'MODAL_PROVISION_FAILED',
      exitCode: error.code || 1,
      details: { 
        error: errorMessage,
        userId: args.userId,
        email: args.email,
      },
    });
  }
}