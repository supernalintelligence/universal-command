import { describe, it, expect } from 'vitest';
import { UniversalCommand } from '../UniversalCommand';
import { testCLI, testMCP } from './index';

describe('testCLI', () => {
  it('should capture stdout from command execution', async () => {
    const cmd = new UniversalCommand({
      name: 'greet',
      description: 'Greet someone',
      input: {
        parameters: [
          { name: 'name', type: 'string', required: true, description: 'Name' }
        ]
      },
      output: { type: 'text' },
      handler: async (args) => `Hello, ${args.name}!`
    });

    const result = await testCLI(cmd, { args: ['--name', 'World'] });

    expect(result.success).toBe(true);
    expect(result.stdout).toContain('Hello, World!');
    expect(result.exitCode).toBe(0);
  });

  it('should capture stderr on validation error', async () => {
    const cmd = new UniversalCommand({
      name: 'greet',
      description: 'Greet someone',
      input: {
        parameters: [
          { name: 'name', type: 'string', required: true, description: 'Name' }
        ]
      },
      output: { type: 'text' },
      handler: async (args) => `Hello, ${args.name}!`
    });

    const result = await testCLI(cmd, { args: [] });

    expect(result.success).toBe(false);
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('Error');
  });

  it('should parse number arguments', async () => {
    const cmd = new UniversalCommand({
      name: 'count',
      description: 'Count to N',
      input: {
        parameters: [
          { name: 'n', type: 'number', required: true, description: 'Number' }
        ]
      },
      output: { type: 'json' },
      handler: async (args) => ({ count: args.n })
    });

    const result = await testCLI(cmd, { args: ['--n', '42'] });

    expect(result.success).toBe(true);
    expect(result.stdout).toContain('42');
  });

  it('should parse boolean arguments', async () => {
    const cmd = new UniversalCommand({
      name: 'toggle',
      description: 'Toggle setting',
      input: {
        parameters: [
          { name: 'enabled', type: 'boolean', description: 'Enable' }
        ]
      },
      output: { type: 'json' },
      handler: async (args) => ({ enabled: args.enabled })
    });

    const result = await testCLI(cmd, { args: ['--enabled', 'true'] });

    expect(result.success).toBe(true);
    expect(result.stdout).toContain('true');
  });

  it('should handle flag without value as true', async () => {
    const cmd = new UniversalCommand({
      name: 'verbose',
      description: 'Verbose output',
      input: {
        parameters: [
          { name: 'verbose', type: 'boolean', description: 'Verbose' }
        ]
      },
      output: { type: 'json' },
      handler: async (args) => ({ verbose: args.verbose })
    });

    const result = await testCLI(cmd, { args: ['--verbose'] });

    expect(result.success).toBe(true);
    expect(result.stdout).toContain('true');
  });

  it('should apply CLI format function', async () => {
    const cmd = new UniversalCommand({
      name: 'users',
      description: 'List users',
      input: { parameters: [] },
      output: { type: 'json' },
      handler: async () => [{ name: 'Alice' }, { name: 'Bob' }],
      cli: {
        format: (users: any[]) => users.map(u => `- ${u.name}`).join('\n')
      }
    });

    const result = await testCLI(cmd, { args: [] });

    expect(result.success).toBe(true);
    expect(result.stdout).toContain('- Alice');
    expect(result.stdout).toContain('- Bob');
  });

  it('should output JSON for json type without format', async () => {
    const cmd = new UniversalCommand({
      name: 'data',
      description: 'Get data',
      input: { parameters: [] },
      output: { type: 'json' },
      handler: async () => ({ key: 'value' })
    });

    const result = await testCLI(cmd, { args: [] });

    expect(result.success).toBe(true);
    expect(result.stdout).toContain('"key"');
    expect(result.stdout).toContain('"value"');
  });
});

describe('testMCP', () => {
  it('should execute MCP tool and return result', async () => {
    const cmd = new UniversalCommand({
      name: 'echo',
      description: 'Echo message',
      input: {
        parameters: [
          { name: 'message', type: 'string', required: true, description: 'Message' }
        ]
      },
      output: { type: 'text' },
      handler: async (args) => ({ echoed: args.message })
    });

    const result = await testMCP(cmd, { arguments: { message: 'hello' } });

    expect(result.content).toBeDefined();
    expect(result.content[0].type).toBe('text');
    expect(JSON.parse(result.content[0].text)).toEqual({ echoed: 'hello' });
  });

  it('should handle errors gracefully', async () => {
    const cmd = new UniversalCommand({
      name: 'fail',
      description: 'Fail',
      input: { parameters: [] },
      output: { type: 'text' },
      handler: async () => { throw new Error('Test error'); }
    });

    const result = await testMCP(cmd, { arguments: {} });

    expect(result.content[0].text).toContain('Error');
    expect(result.content[0].text).toContain('Test error');
  });
});
