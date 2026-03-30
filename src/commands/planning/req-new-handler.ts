/**
 * Planning Req New Handler - Universal Command Implementation
 *
 * Wraps existing requirement creation logic
 */

import { ExecutionContext } from '../../types';
import { CommandError } from '../../errors';

// Import existing implementation
const { RequirementCommandHandler } = require('../../../../../supernal-code-package/lib/cli/commands/requirement/index');

export interface ReqNewInput {
  title: string;
  epic?: string;
  category?: string;
  priority?: string;
  requestType?: string;
  feature?: string;
  tags?: string;
  status?: string;
  assignee?: string;
  dryRun?: boolean;
  yes?: boolean;
  noRegister?: boolean;
  userid?: string;
  notes?: string;
  verbose?: boolean;
}

export interface ReqNewOutput {
  success: boolean;
  requirementId?: string;
  filePath?: string;
  message: string;
}

/**
 * Universal Command Handler for planning req new
 */
export async function handler(
  args: ReqNewInput,
  context: ExecutionContext
): Promise<ReqNewOutput> {
  try {
    // Capture stdout/stderr if provided
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
      // Create handler instance
      const handler = new RequirementCommandHandler();

      // Convert args to legacy format
      const legacyArgs = [args.title];

      // Add options in legacy format
      if (args.epic) legacyArgs.push(`--epic=${args.epic}`);
      if (args.category) legacyArgs.push(`--category=${args.category}`);
      if (args.priority) legacyArgs.push(`--priority=${args.priority}`);
      if (args.requestType) legacyArgs.push(`--request-type=${args.requestType}`);
      if (args.feature) legacyArgs.push(`--feature=${args.feature}`);
      if (args.tags) legacyArgs.push(`--tags=${args.tags}`);
      if (args.status) legacyArgs.push(`--status=${args.status}`);
      if (args.assignee) legacyArgs.push(`--assignee=${args.assignee}`);
      if (args.dryRun) legacyArgs.push('--dry-run');
      if (args.yes) legacyArgs.push('--yes');
      if (args.noRegister) legacyArgs.push('--no-register');
      if (args.userid) legacyArgs.push(`--userid=${args.userid}`);
      if (args.notes) legacyArgs.push(`--notes=${args.notes}`);
      if (args.verbose) legacyArgs.push('--verbose');

      // Call existing implementation
      await handler.handleCommand('new', ...legacyArgs);

      return {
        success: true,
        message: 'Requirement created successfully',
      };
    } finally {
      // Restore console
      console.log = originalStdout;
      console.error = originalStderr;
    }
  } catch (error: any) {
    // Map to CommandError with appropriate exit code
    throw new CommandError(
      error.message || 'Requirement creation failed',
      {
        code: 'REQ_NEW_FAILED',
        exitCode: 1,
        details: { error: error.message },
      }
    );
  }
}
