/**
 * Testing utilities for Universal Command
 */

import { UniversalCommand } from '../UniversalCommand';
import { Writable } from 'stream';

/**
 * Result of CLI test execution
 */
export interface CLITestResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  success: boolean;
}

/**
 * Test CLI execution with output capture
 */
export async function testCLI(
  command: UniversalCommand,
  options: {
    args: string[];
    timeout?: number;
  }
): Promise<CLITestResult> {
  let stdout = '';
  let stderr = '';

  const mockStdout = new Writable({
    write(chunk, encoding, callback) {
      stdout += chunk.toString();
      callback();
    }
  });

  const mockStderr = new Writable({
    write(chunk, encoding, callback) {
      stderr += chunk.toString();
      callback();
    }
  });

  try {
    const parsedArgs = parseArgs(options.args);

    const result = await command.execute(parsedArgs, {
      interface: 'cli',
      stdout: mockStdout,
      stderr: mockStderr
    });

    if (command.schema.cli?.format) {
      stdout += command.schema.cli.format(result);
    } else if (command.schema.output.type === 'json') {
      stdout += JSON.stringify(result, null, 2);
    } else {
      stdout += String(result);
    }

    return { stdout, stderr, exitCode: 0, success: true };
  } catch (error: any) {
    stderr += `Error: ${error.message}\n`;
    return { stdout, stderr, exitCode: error.exitCode || 1, success: false };
  }
}

/**
 * Parse CLI args array into object
 * e.g., ['--name', 'test', '--count', '5'] => { name: 'test', count: 5 }
 */
function parseArgs(args: string[]): Record<string, any> {
  const result: Record<string, any> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const nextArg = args[i + 1];

      if (nextArg && !nextArg.startsWith('--')) {
        if (nextArg === 'true') result[key] = true;
        else if (nextArg === 'false') result[key] = false;
        else if (!isNaN(Number(nextArg))) result[key] = Number(nextArg);
        else result[key] = nextArg;
        i++;
      } else {
        result[key] = true;
      }
    }
  }

  return result;
}

/**
 * Test API execution
 */
export async function testAPI(
  command: UniversalCommand,
  options: {
    method?: string;
    body?: any;
    query?: Record<string, string>;
  }
): Promise<any> {
  const mockRequest = {
    method: options.method || 'GET',
    nextUrl: {
      searchParams: new URLSearchParams(options.query || {})
    },
    json: async () => options.body || {}
  };

  const apiRoute = command.toNextAPI();
  const handler = apiRoute[options.method as keyof typeof apiRoute];

  if (!handler) {
    throw new Error(`Method ${options.method} not supported`);
  }

  return await handler(mockRequest);
}

/**
 * Test MCP execution
 */
export async function testMCP(
  command: UniversalCommand,
  options: {
    arguments: any;
  }
): Promise<any> {
  const mcpTool = command.toMCP();
  return await mcpTool.execute(options.arguments);
}
