/**
 * Tests for migrated git push command (P0-1)
 *
 * Validates that universal-command implementation maintains compatibility
 * with existing auto-push behavior
 */

import { describe, it, expect } from 'vitest';
import { gitPushCommand } from '../push';

describe('Git Push (Universal Command)', () => {
  it('should have correct metadata', () => {
    const metadata = gitPushCommand.getMetadata();

    expect(metadata.name).toBe('git push');
    expect(metadata.description).toContain('Push current branch');
    expect(metadata.category).toBe('git');
    expect(metadata.cli?.path).toEqual(['git', 'push']);
  });

  it('should validate parameters', () => {
    // Default (verbose true)
    const v1 = gitPushCommand.validateArgs({});
    expect(v1.valid).toBe(true);
    expect(v1.data?.verbose).toBe(true);

    // Explicit verbose
    const v2 = gitPushCommand.validateArgs({
      verbose: false,
    });
    expect(v2.valid).toBe(true);
    expect(v2.data?.verbose).toBe(false);
  });

  it('should generate CLI command correctly', () => {
    const cliCmd = gitPushCommand.toCLI();

    expect(cliCmd.name()).toBe('push');
    expect(cliCmd.description()).toContain('Push current branch');

    // Check options
    const options = cliCmd.options;
    const optionFlags = options.map((o: any) => o.flags);
    expect(optionFlags.some((f: string) => f.includes('verbose'))).toBe(true);
  });

  it('should support MCP interface', () => {
    const mcpTool = gitPushCommand.toMCP();

    expect(mcpTool.name).toMatch(/git_push$/);
    expect(mcpTool.description).toContain('Push current branch');
    expect(mcpTool.inputSchema.properties).toHaveProperty('verbose');
  });

  it('should preserve default values', () => {
    const validation = gitPushCommand.validateArgs({});

    expect(validation.valid).toBe(true);
    expect(validation.data?.verbose).toBe(true);
  });
});

describe('Git Push - Phase 1 Gate 1 Validation', () => {
  it('should pass P0-1: Subcommand Tree validation', () => {
    const metadata = gitPushCommand.getMetadata();

    expect(metadata.cli?.path).toEqual(['git', 'push']);

    // Build command tree
    const roots = gitPushCommand.constructor.buildCommandTree([
      gitPushCommand as any,
    ]);
    expect(roots).toHaveLength(1);
    expect(roots[0].name()).toBe('git');
  });

  it('should pass P0-3: Lazy Loading validation', () => {
    // Verify handler is not loaded until execution
    expect(gitPushCommand['handlerLoaded']).toBe(false);

    // Metadata should be available without loading handler
    const metadata = gitPushCommand.getMetadata();
    expect(metadata.name).toBe('git push');

    // Handler still not loaded
    expect(gitPushCommand['handlerLoaded']).toBe(false);
  });

  it('should integrate with git command tree', () => {
    // When combined with other git commands, should nest properly
    const roots = gitPushCommand.constructor.buildCommandTree([
      gitPushCommand as any,
    ]);

    expect(roots).toHaveLength(1);
    expect(roots[0].name()).toBe('git');

    const gitSubcommands = roots[0].commands;
    expect(gitSubcommands).toHaveLength(1);
    expect(gitSubcommands[0].name()).toBe('push');
  });
});
