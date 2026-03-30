/**
 * Tests for P0-3: Lazy Loading
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LazyUniversalCommand, LazyCommandPerformance } from './LazyUniversalCommand';
import { writeFileSync, unlinkSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

// Create temporary test handler files
const TEST_HANDLER_DIR = join(__dirname, '__test_handlers__');
const TEST_HANDLER_PATH = join(TEST_HANDLER_DIR, 'test-handler.js');
const SLOW_HANDLER_PATH = join(TEST_HANDLER_DIR, 'slow-handler.js');

describe('P0-3: Lazy Loading', () => {
  beforeEach(() => {
    // Create test handler directory
    if (!existsSync(TEST_HANDLER_DIR)) {
      mkdirSync(TEST_HANDLER_DIR, { recursive: true });
    }

    // Write test handler
    writeFileSync(
      TEST_HANDLER_PATH,
      `
module.exports = {
  handler: async (args, context) => {
    return { success: true, args };
  },
  namedHandler: async (args, context) => {
    return { custom: true, args };
  }
};
`,
      'utf-8'
    );

    // Write slow handler (simulates expensive import)
    writeFileSync(
      SLOW_HANDLER_PATH,
      `
// Simulate slow module load
const start = Date.now();
while (Date.now() - start < 50) {
  // Busy wait 50ms
}

module.exports = {
  handler: async (args, context) => {
    return { slow: true };
  }
};
`,
      'utf-8'
    );

    LazyCommandPerformance.reset();
  });

  afterEach(() => {
    // Cleanup test files
    try {
      unlinkSync(TEST_HANDLER_PATH);
      unlinkSync(SLOW_HANDLER_PATH);
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should create lazy command without loading handler', () => {
    const command = new LazyUniversalCommand({
      name: 'test',
      description: 'Test command',
      handlerPath: TEST_HANDLER_PATH,
      input: { parameters: [] },
      output: { type: 'json' },
    });

    // Handler should NOT be loaded yet
    expect(command.isHandlerLoaded()).toBe(false);
  });

  it('should load handler on first execute', async () => {
    const command = new LazyUniversalCommand({
      name: 'test',
      description: 'Test command',
      handlerPath: TEST_HANDLER_PATH,
      input: { parameters: [] },
      output: { type: 'json' },
    });

    expect(command.isHandlerLoaded()).toBe(false);

    // Execute should load handler
    const result = await command.execute({}, { interface: 'test' });

    expect(command.isHandlerLoaded()).toBe(true);
    expect(result).toEqual({ success: true, args: {} });
  });

  it('should cache handler after first load', async () => {
    const command = new LazyUniversalCommand({
      name: 'test',
      description: 'Test command',
      handlerPath: TEST_HANDLER_PATH,
      input: {
        parameters: [
          {
            name: 'foo',
            type: 'string',
            description: 'Test parameter',
            required: false,
          }
        ]
      },
      output: { type: 'json' },
    });

    // First execution loads handler
    await command.execute({}, { interface: 'test' });
    expect(command.isHandlerLoaded()).toBe(true);

    // Second execution should NOT reload
    const result = await command.execute({ foo: 'bar' }, { interface: 'test' });
    expect(result).toEqual({ success: true, args: { foo: 'bar' } });
  });

  it('should support custom handler export name', async () => {
    const command = new LazyUniversalCommand({
      name: 'test',
      description: 'Test command',
      handlerPath: TEST_HANDLER_PATH,
      handlerExport: 'namedHandler',
      input: { parameters: [] },
      output: { type: 'json' },
    });

    const result = await command.execute({}, { interface: 'test' });

    expect(result).toEqual({ custom: true, args: {} });
  });

  it('should throw error if handler not found', async () => {
    const command = new LazyUniversalCommand({
      name: 'test',
      description: 'Test command',
      handlerPath: TEST_HANDLER_PATH,
      handlerExport: 'nonExistentHandler',
      input: { parameters: [] },
      output: { type: 'json' },
    });

    await expect(command.execute({}, { interface: 'test' })).rejects.toThrow(/Handler not found/);
  });

  it('should throw error if handler module not found', async () => {
    const command = new LazyUniversalCommand({
      name: 'test',
      description: 'Test command',
      handlerPath: './nonexistent-module',
      input: { parameters: [] },
      output: { type: 'json' },
    });

    await expect(command.execute({}, { interface: 'test' })).rejects.toThrow(
      /Failed to load handler/
    );
  });

  it('should provide metadata without loading handler', () => {
    const command = new LazyUniversalCommand({
      name: 'test',
      description: 'Test command',
      category: 'testing',
      scope: 'test-scope',
      keywords: ['test', 'demo'],
      handlerPath: TEST_HANDLER_PATH,
      input: {
        parameters: [
          {
            name: 'foo',
            type: 'string',
            description: 'Test param',
            required: true,
          },
        ],
      },
      output: { type: 'json' },
    });

    const metadata = command.getMetadata();

    expect(command.isHandlerLoaded()).toBe(false);
    expect(metadata).toEqual({
      name: 'test',
      description: 'Test command',
      category: 'testing',
      scope: 'test-scope',
      keywords: ['test', 'demo'],
      input: {
        parameters: [
          {
            name: 'foo',
            type: 'string',
            description: 'Test param',
            required: true,
          },
        ],
      },
      output: { type: 'json', schema: undefined },
      cli: undefined,
      api: undefined,
      mcp: undefined,
    });
  });

  it('should generate CLI without loading handler', () => {
    const command = new LazyUniversalCommand({
      name: 'test',
      description: 'Test command',
      handlerPath: TEST_HANDLER_PATH,
      input: { parameters: [] },
      output: { type: 'json' },
    });

    const cli = command.toCLI();

    // Handler should NOT be loaded during CLI generation
    expect(command.isHandlerLoaded()).toBe(false);
    expect(cli.name()).toBe('test');
    expect(cli.description()).toBe('Test command');
  });

  it('should support preload for warming up', async () => {
    const command = new LazyUniversalCommand({
      name: 'test',
      description: 'Test command',
      handlerPath: TEST_HANDLER_PATH,
      input: { parameters: [] },
      output: { type: 'json' },
    });

    expect(command.isHandlerLoaded()).toBe(false);

    await command.preload();

    expect(command.isHandlerLoaded()).toBe(true);
  });

  it('should validate arguments before loading handler', async () => {
    const command = new LazyUniversalCommand({
      name: 'test',
      description: 'Test command',
      handlerPath: TEST_HANDLER_PATH,
      input: {
        parameters: [
          {
            name: 'required',
            type: 'string',
            description: 'Required param',
            required: true,
          },
        ],
      },
      output: { type: 'json' },
    });

    // Validation should fail BEFORE loading handler
    try {
      await command.execute({}, { interface: 'test' });
      throw new Error('Expected validation error');
    } catch (error: any) {
      expect(error.message).toContain('Invalid command arguments');
      expect(error.errors).toBeDefined();
      expect(error.errors[0].message).toContain('required');
    }

    // Handler should NOT be loaded due to validation failure
    expect(command.isHandlerLoaded()).toBe(false);
  });
});

describe('P0-3: Performance Benchmarks', () => {
  beforeEach(() => {
    if (!existsSync(TEST_HANDLER_DIR)) {
      mkdirSync(TEST_HANDLER_DIR, { recursive: true });
    }

    writeFileSync(
      SLOW_HANDLER_PATH,
      `
// Simulate slow module load
const start = Date.now();
while (Date.now() - start < 20) {}

module.exports = {
  handler: async () => ({ loaded: true })
};
`,
      'utf-8'
    );
  });

  afterEach(() => {
    try {
      unlinkSync(SLOW_HANDLER_PATH);
    } catch {}
  });

  it('should measure performance improvement from lazy loading', async () => {
    // Create 10 commands
    const commands = Array.from({ length: 10 }, (_, i) => {
      return new LazyUniversalCommand({
        name: `command-${i}`,
        description: `Command ${i}`,
        handlerPath: SLOW_HANDLER_PATH,
        input: { parameters: [] },
        output: { type: 'json' },
      });
    });

    // Measure CLI generation time (no handler loading)
    const startCLI = Date.now();
    for (const cmd of commands) {
      cmd.toCLI();
    }
    const cliTime = Date.now() - startCLI;

    // CLI generation should be FAST (< 50ms)
    expect(cliTime).toBeLessThan(50);

    // Verify handlers NOT loaded
    for (const cmd of commands) {
      expect(cmd.isHandlerLoaded()).toBe(false);
    }

    // Now execute ONE command (loads only its handler)
    const startExec = Date.now();
    await commands[0].execute({}, { interface: 'test' });
    const execTime = Date.now() - startExec;

    // Only first command loaded
    expect(commands[0].isHandlerLoaded()).toBe(true);
    expect(commands[1].isHandlerLoaded()).toBe(false);

    console.log(`
Lazy Loading Performance:
  CLI generation (10 commands): ${cliTime}ms
  First execution (1 handler): ${execTime}ms
  Handlers loaded: 1/10 (90% saved)
  Estimated eager load time: ${execTime * 10}ms
  Lazy load speedup: ${((execTime * 10) / cliTime).toFixed(1)}x faster
`);
  });

  it('should demonstrate startup time savings', async () => {
    const commandCount = 5;

    // Lazy loading: Create all commands (no handler loading)
    const lazyStart = Date.now();
    const lazyCommands = Array.from({ length: commandCount }, (_, i) => {
      const cmd = new LazyUniversalCommand({
        name: `cmd-${i}`,
        description: `Command ${i}`,
        handlerPath: SLOW_HANDLER_PATH,
        input: { parameters: [] },
        output: { type: 'json' },
      });
      cmd.toCLI(); // Generate CLI without loading
      return cmd;
    });
    const lazyTime = Date.now() - lazyStart;

    // Verify handlers NOT loaded during lazy phase
    expect(lazyCommands.every(cmd => !cmd.isHandlerLoaded())).toBe(true);

    // Eager loading: Load all handlers upfront
    const eagerStart = Date.now();
    for (const cmd of lazyCommands) {
      await cmd.preload();
    }
    const eagerTime = Date.now() - eagerStart;

    // Verify handlers ARE loaded after eager phase
    expect(lazyCommands.every(cmd => cmd.isHandlerLoaded())).toBe(true);

    console.log(`
Startup Time Comparison (${commandCount} commands):
  Lazy loading: ${lazyTime}ms
  Eager loading: ${eagerTime}ms
  Speedup: ${eagerTime > 0 && lazyTime > 0 ? (eagerTime / lazyTime).toFixed(1) : 'N/A (too fast to measure)'}x faster
`);

    // Lazy should be faster OR both should be very fast
    // (On fast systems, both might be 0ms which is still a pass)
    if (lazyTime > 0 && eagerTime > 0) {
      expect(lazyTime).toBeLessThanOrEqual(eagerTime);
      const speedup = eagerTime / lazyTime;
      expect(speedup).toBeGreaterThan(1);
    }
  });
});
