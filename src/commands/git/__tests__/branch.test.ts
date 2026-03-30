/**
 * Tests for migrated git branch command (P0-1)
 *
 * Validates that universal-command implementation maintains compatibility
 * with existing session branch management
 */

import { describe, it, expect } from 'vitest';
import { gitBranchCommand } from '../branch';

describe('Git Branch (Universal Command)', () => {
  it('should have correct metadata', () => {
    const metadata = gitBranchCommand.getMetadata();

    expect(metadata.name).toBe('git branch');
    expect(metadata.description).toContain('Session branch management');
    expect(metadata.category).toBe('git');
    expect(metadata.cli?.path).toEqual(['git', 'branch']);
  });

  it('should validate parameters', () => {
    // Default action (status)
    const v1 = gitBranchCommand.validateArgs({});
    expect(v1.valid).toBe(true);
    expect(v1.data?.action).toBe('status');

    // Start action with options
    const v2 = gitBranchCommand.validateArgs({
      action: 'start',
      base: 'main',
      notes: 'Feature work',
    });
    expect(v2.valid).toBe(true);
    expect(v2.data?.action).toBe('start');
    expect(v2.data?.base).toBe('main');
    expect(v2.data?.notes).toBe('Feature work');

    // Finish action with push
    const v3 = gitBranchCommand.validateArgs({
      action: 'finish',
      push: true,
      pr: true,
    });
    expect(v3.valid).toBe(true);
    expect(v3.data?.action).toBe('finish');
    expect(v3.data?.push).toBe(true);
    expect(v3.data?.pr).toBe(true);

    // List action with filters
    const v4 = gitBranchCommand.validateArgs({
      action: 'list',
      user: 'alice',
      active: true,
    });
    expect(v4.valid).toBe(true);
    expect(v4.data?.action).toBe('list');
    expect(v4.data?.user).toBe('alice');
    expect(v4.data?.active).toBe(true);
  });

  it('should generate CLI command correctly', () => {
    const cliCmd = gitBranchCommand.toCLI();

    expect(cliCmd.name()).toBe('branch');
    expect(cliCmd.description()).toContain('Session branch management');

    // Check positional argument
    const args = (cliCmd as any)._args;
    expect(args).toBeDefined();
    expect(args.some((a: any) => a.name() === 'action')).toBe(true);

    // Check options
    const options = cliCmd.options;
    const optionFlags = options.map((o: any) => o.flags);
    expect(optionFlags.some((f: string) => f.includes('base'))).toBe(true);
    expect(optionFlags.some((f: string) => f.includes('push'))).toBe(true);
    expect(optionFlags.some((f: string) => f.includes('pr'))).toBe(true);
  });

  it('should support MCP interface', () => {
    const mcpTool = gitBranchCommand.toMCP();

    expect(mcpTool.name).toMatch(/git_branch$/);
    expect(mcpTool.description).toContain('Session branch management');
    expect(mcpTool.inputSchema.properties).toHaveProperty('action');
    expect(mcpTool.inputSchema.properties).toHaveProperty('base');
    expect(mcpTool.inputSchema.properties).toHaveProperty('push');
  });

  it('should support all actions', () => {
    const params = gitBranchCommand.schema.input.parameters;
    const actionParam = params.find((p) => p.name === 'action');

    expect(actionParam).toBeDefined();
    expect(actionParam?.positional).toBe(true);
    expect(actionParam?.default).toBe('status');
  });

  it('should preserve default values', () => {
    const validation = gitBranchCommand.validateArgs({});

    expect(validation.valid).toBe(true);
    expect(validation.data?.action).toBe('status');
    expect(validation.data?.push).toBe(false);
    expect(validation.data?.pr).toBe(false);
    expect(validation.data?.active).toBe(false);
  });
});

describe('Git Branch - Phase 1 Gate 1 Validation', () => {
  it('should pass P0-1: Subcommand Tree validation', () => {
    const metadata = gitBranchCommand.getMetadata();

    expect(metadata.cli?.path).toEqual(['git', 'branch']);

    // Build command tree
    const roots = gitBranchCommand.constructor.buildCommandTree([
      gitBranchCommand as any,
    ]);
    expect(roots).toHaveLength(1);
    expect(roots[0].name()).toBe('git');
  });

  it('should pass P0-2: Positional Arguments validation', () => {
    const params = gitBranchCommand.schema.input.parameters;
    const actionParam = params.find((p) => p.name === 'action');

    expect(actionParam).toBeDefined();
    expect(actionParam?.positional).toBe(true);
    expect(actionParam?.required).toBe(false);
    expect(actionParam?.type).toBe('string');
  });

  it('should pass P0-3: Lazy Loading validation', () => {
    // Verify handler is not loaded until execution
    expect(gitBranchCommand['handlerLoaded']).toBe(false);

    // Metadata should be available without loading handler
    const metadata = gitBranchCommand.getMetadata();
    expect(metadata.name).toBe('git branch');

    // Handler still not loaded
    expect(gitBranchCommand['handlerLoaded']).toBe(false);
  });

  it('should integrate with git command tree', () => {
    // When combined with other git commands, should nest properly
    const roots = gitBranchCommand.constructor.buildCommandTree([
      gitBranchCommand as any,
    ]);

    expect(roots).toHaveLength(1);
    expect(roots[0].name()).toBe('git');

    const gitSubcommands = roots[0].commands;
    expect(gitSubcommands).toHaveLength(1);
    expect(gitSubcommands[0].name()).toBe('branch');
  });
});
