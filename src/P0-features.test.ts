/**
 * Tests for P0 Features:
 * - P0-1: Subcommand trees
 * - P0-2: Positional arguments
 * - P0-4: Streaming output
 * - P0-5: CLI interactivity
 * - P0-6: Pass-through flags
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { UniversalCommand } from './UniversalCommand';
import { CommandSchema } from './types';
import { Writable } from 'stream';

describe('P0-1: Subcommand Trees', () => {
  it('should use cli.path for nested commands', () => {
    const command = new UniversalCommand({
      name: 'git worktree merge',
      description: 'Merge worktree branch',
      cli: {
        path: ['git', 'worktree', 'merge'],
      },
      input: { parameters: [] },
      output: { type: 'text' },
      handler: async () => 'merged',
    });

    const cliCmd = command.toCLI();

    // Commander command should have name 'merge' (leaf of path)
    expect(cliCmd.name()).toBe('merge');
    expect(cliCmd.description()).toBe('Merge worktree branch');
  });

  it('should fall back to splitting schema.name if no cli.path', () => {
    const command = new UniversalCommand({
      name: 'health check status',
      description: 'Check health status',
      input: { parameters: [] },
      output: { type: 'text' },
      handler: async () => 'healthy',
    });

    const cliCmd = command.toCLI();

    // Should use last segment of name as command name
    expect(cliCmd.name()).toBe('status');
  });

  it('should build nested command tree from multiple commands', () => {
    const cmd1 = new UniversalCommand({
      name: 'git worktree add',
      description: 'Add worktree',
      cli: { path: ['git', 'worktree', 'add'] },
      input: { parameters: [] },
      output: { type: 'text' },
      handler: async () => 'added',
    });

    const cmd2 = new UniversalCommand({
      name: 'git worktree remove',
      description: 'Remove worktree',
      cli: { path: ['git', 'worktree', 'remove'] },
      input: { parameters: [] },
      output: { type: 'text' },
      handler: async () => 'removed',
    });

    const roots = UniversalCommand.buildCommandTree([cmd1, cmd2]);

    // Should have one root: 'git'
    expect(roots).toHaveLength(1);
    expect(roots[0].name()).toBe('git');

    // git should have 'worktree' subcommand
    const gitSubcommands = roots[0].commands;
    expect(gitSubcommands).toHaveLength(1);
    expect(gitSubcommands[0].name()).toBe('worktree');

    // worktree should have 'add' and 'remove' subcommands
    const worktreeSubcommands = gitSubcommands[0].commands;
    expect(worktreeSubcommands).toHaveLength(2);
    const names = worktreeSubcommands.map((c: any) => c.name());
    expect(names).toContain('add');
    expect(names).toContain('remove');
  });
});

describe('P0-2: Positional Arguments', () => {
  it('should handle required positional argument', () => {
    const command = new UniversalCommand({
      name: 'deploy',
      description: 'Deploy to environment',
      input: {
        parameters: [
          {
            name: 'environment',
            type: 'string',
            description: 'Target environment',
            required: true,
            positional: true,
          },
        ],
      },
      output: { type: 'text' },
      handler: async (args) => `Deploying to ${args.environment}`,
    });

    const cliCmd = command.toCLI();

    // Check that positional argument was added
    const registeredArgs = (cliCmd as any)._args;
    expect(registeredArgs).toHaveLength(1);
    expect(registeredArgs[0].name()).toBe('environment');
    expect(registeredArgs[0].required).toBe(true);
  });

  it('should handle optional positional argument', () => {
    const command = new UniversalCommand({
      name: 'log',
      description: 'Show logs',
      input: {
        parameters: [
          {
            name: 'service',
            type: 'string',
            description: 'Service name',
            required: false,
            positional: true,
            default: 'all',
          },
        ],
      },
      output: { type: 'text' },
      handler: async (args) => `Logs for ${args.service}`,
    });

    const cliCmd = command.toCLI();

    const registeredArgs = (cliCmd as any)._args;
    expect(registeredArgs).toHaveLength(1);
    expect(registeredArgs[0].name()).toBe('service');
    expect(registeredArgs[0].required).toBe(false);
  });

  it('should handle variadic positional argument', () => {
    const command = new UniversalCommand({
      name: 'commit',
      description: 'Commit files',
      input: {
        parameters: [
          {
            name: 'files',
            type: 'array',
            description: 'Files to commit',
            required: true,
            positional: true,
            variadic: true,
          },
        ],
      },
      output: { type: 'text' },
      handler: async (args) => `Committed ${args.files.length} files`,
    });

    const cliCmd = command.toCLI();

    const registeredArgs = (cliCmd as any)._args;
    expect(registeredArgs).toHaveLength(1);
    expect(registeredArgs[0].name()).toBe('files');
    expect(registeredArgs[0].variadic).toBe(true);
  });

  it('should mix positional and option parameters', () => {
    const command = new UniversalCommand({
      name: 'copy',
      description: 'Copy file',
      input: {
        parameters: [
          {
            name: 'source',
            type: 'string',
            description: 'Source file',
            required: true,
            positional: true,
            position: 0,
          },
          {
            name: 'dest',
            type: 'string',
            description: 'Destination file',
            required: true,
            positional: true,
            position: 1,
          },
          {
            name: 'force',
            type: 'boolean',
            description: 'Force overwrite',
            required: false,
          },
        ],
      },
      output: { type: 'text' },
      handler: async (args) =>
        `Copied ${args.source} to ${args.dest}${args.force ? ' (forced)' : ''}`,
    });

    const cliCmd = command.toCLI();

    // Check positional args
    const registeredArgs = (cliCmd as any)._args;
    expect(registeredArgs).toHaveLength(2);
    expect(registeredArgs[0].name()).toBe('source');
    expect(registeredArgs[1].name()).toBe('dest');

    // Check options
    const options = (cliCmd as any).options;
    const forceOption = options.find((o: any) => o.long === '--force');
    expect(forceOption).toBeDefined();
  });

  it('should sort positional parameters by position', () => {
    const command = new UniversalCommand({
      name: 'test',
      description: 'Test command',
      input: {
        parameters: [
          {
            name: 'third',
            type: 'string',
            description: 'Third arg',
            positional: true,
            position: 2,
          },
          {
            name: 'first',
            type: 'string',
            description: 'First arg',
            positional: true,
            position: 0,
          },
          {
            name: 'second',
            type: 'string',
            description: 'Second arg',
            positional: true,
            position: 1,
          },
        ],
      },
      output: { type: 'text' },
      handler: async () => 'done',
    });

    const cliCmd = command.toCLI();

    const registeredArgs = (cliCmd as any)._args;
    expect(registeredArgs[0].name()).toBe('first');
    expect(registeredArgs[1].name()).toBe('second');
    expect(registeredArgs[2].name()).toBe('third');
  });
});

describe('P0-4: Streaming Output', () => {
  it('should include stream in context when streaming enabled', async () => {
    let receivedContext: any = null;

    const command = new UniversalCommand({
      name: 'stream-test',
      description: 'Test streaming',
      cli: { streaming: true },
      input: { parameters: [] },
      output: { type: 'stream' },
      handler: async (args, context) => {
        receivedContext = context;
        return 'streamed';
      },
    });

    const mockStream = new Writable({
      write(chunk, encoding, callback) {
        callback();
      },
    });

    await command.execute(
      {},
      {
        interface: 'cli',
        stream: mockStream,
      }
    );

    expect(receivedContext).toBeDefined();
    expect(receivedContext.stream).toBe(mockStream);
  });
});

describe('P0-5: CLI Interactivity', () => {
  it('should include stdin in context', async () => {
    let receivedContext: any = null;

    const command = new UniversalCommand({
      name: 'interactive-test',
      description: 'Test interactivity',
      input: { parameters: [] },
      output: { type: 'text' },
      handler: async (args, context) => {
        receivedContext = context;
        return 'done';
      },
    });

    const mockStdin = { pipe: () => {} } as any;

    await command.execute(
      {},
      {
        interface: 'cli',
        stdin: mockStdin,
        isTTY: true,
      }
    );

    expect(receivedContext.stdin).toBe(mockStdin);
    expect(receivedContext.isTTY).toBe(true);
  });

  it('should include prompt function when isTTY', async () => {
    let receivedContext: any = null;

    const command = new UniversalCommand({
      name: 'prompt-test',
      description: 'Test prompting',
      input: { parameters: [] },
      output: { type: 'text' },
      handler: async (args, context) => {
        receivedContext = context;
        return 'done';
      },
    });

    const mockPrompt = async (_msg: string) => 'user input';

    await command.execute(
      {},
      {
        interface: 'cli',
        isTTY: true,
        prompt: mockPrompt,
      }
    );

    expect(receivedContext.prompt).toBeDefined();
    expect(typeof receivedContext.prompt).toBe('function');
  });
});

describe('P0-6: Pass-Through Flags', () => {
  it('should enable allowUnknownOption when configured', () => {
    const command = new UniversalCommand({
      name: 'pass-through-test',
      description: 'Test pass-through',
      cli: {
        allowUnknownOption: true,
        passThroughOptions: true,
      },
      input: { parameters: [] },
      output: { type: 'text' },
      handler: async () => 'done',
    });

    const cliCmd = command.toCLI();

    // Commander's allowUnknownOption() sets this property
    expect((cliCmd as any)._allowUnknownOption).toBe(true);
  });

  it('should include pass-through options in context', async () => {
    let receivedContext: any = null;

    const command = new UniversalCommand({
      name: 'pass-through-test',
      description: 'Test pass-through',
      cli: {
        allowUnknownOption: true,
        passThroughOptions: true,
      },
      input: { parameters: [] },
      output: { type: 'text' },
      handler: async (args, context) => {
        receivedContext = context;
        return 'done';
      },
    });

    await command.execute(
      {},
      {
        interface: 'cli',
        passThroughOptions: ['--unknown-flag', 'value'],
      }
    );

    expect(receivedContext.passThroughOptions).toEqual(['--unknown-flag', 'value']);
  });
});

describe('P0 Integration Tests', () => {
  it('should support all P0 features together', async () => {
    let receivedContext: any = null;
    let receivedArgs: any = null;

    const command = new UniversalCommand({
      name: 'complex-command',
      description: 'Complex command with all features',
      cli: {
        path: ['app', 'deploy'],
        streaming: true,
        allowUnknownOption: true,
        passThroughOptions: true,
      },
      input: {
        parameters: [
          {
            name: 'environment',
            type: 'string',
            description: 'Target environment',
            required: true,
            positional: true,
          },
          {
            name: 'services',
            type: 'array',
            description: 'Services to deploy',
            required: false,
            positional: true,
            variadic: true,
          },
          {
            name: 'force',
            type: 'boolean',
            description: 'Force deployment',
            required: false,
          },
        ],
      },
      output: { type: 'stream' },
      handler: async (args, context) => {
        receivedContext = context;
        receivedArgs = args;
        return 'deployed';
      },
    });

    const cliCmd = command.toCLI();

    // Verify command structure
    expect(cliCmd.name()).toBe('deploy');

    // Verify positional args
    const registeredArgs = (cliCmd as any)._args;
    expect(registeredArgs).toHaveLength(2);
    expect(registeredArgs[0].name()).toBe('environment');
    expect(registeredArgs[1].name()).toBe('services');
    expect(registeredArgs[1].variadic).toBe(true);

    // Verify options
    const forceOption = (cliCmd as any).options.find((o: any) => o.long === '--force');
    expect(forceOption).toBeDefined();

    // Verify pass-through enabled
    expect((cliCmd as any)._allowUnknownOption).toBe(true);

    // Test execution
    const mockStream = new Writable({ write: (c, e, cb) => cb() });

    await command.execute(
      {
        environment: 'production',
        services: ['api', 'web'],
        force: true,
      },
      {
        interface: 'cli',
        stream: mockStream,
        stdin: process.stdin,
        isTTY: true,
        passThroughOptions: ['--verbose'],
      }
    );

    expect(receivedArgs).toEqual({
      environment: 'production',
      services: ['api', 'web'],
      force: true,
    });

    expect(receivedContext.stream).toBe(mockStream);
    expect(receivedContext.stdin).toBe(process.stdin);
    expect(receivedContext.isTTY).toBe(true);
    expect(receivedContext.passThroughOptions).toEqual(['--verbose']);
  });
});
