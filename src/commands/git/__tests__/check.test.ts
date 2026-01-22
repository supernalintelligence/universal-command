/**
 * Tests for migrated git check command (P0-1)
 *
 * Validates that universal-command implementation maintains compatibility
 * with existing repository check functionality
 */

import { describe, it, expect } from 'vitest';
import { gitCheckCommand } from '../check';

describe('Git Check (Universal Command)', () => {
  it('should have correct metadata', () => {
    const metadata = gitCheckCommand.getMetadata();

    expect(metadata.name).toBe('git check');
    expect(metadata.description).toContain('Check repository context');
    expect(metadata.category).toBe('git');
    expect(metadata.cli?.path).toEqual(['git', 'check']);
  });

  it('should validate parameters', () => {
    // Default (verbose false)
    const v1 = gitCheckCommand.validateArgs({});
    expect(v1.valid).toBe(true);
    expect(v1.data?.verbose).toBe(false);

    // Explicit verbose
    const v2 = gitCheckCommand.validateArgs({
      verbose: true,
    });
    expect(v2.valid).toBe(true);
    expect(v2.data?.verbose).toBe(true);
  });

  it('should generate CLI command correctly', () => {
    const cliCmd = gitCheckCommand.toCLI();

    expect(cliCmd.name()).toBe('check');
    expect(cliCmd.description()).toContain('Check repository context');

    // Check options
    const options = cliCmd.options;
    const optionFlags = options.map((o: any) => o.flags);
    expect(optionFlags.some((f: string) => f.includes('verbose'))).toBe(true);
  });

  it('should support MCP interface', () => {
    const mcpTool = gitCheckCommand.toMCP();

    expect(mcpTool.name).toMatch(/git_check$/);
    expect(mcpTool.description).toContain('Check repository context');
    expect(mcpTool.inputSchema.properties).toHaveProperty('verbose');
  });

  it('should preserve default values', () => {
    const validation = gitCheckCommand.validateArgs({});

    expect(validation.valid).toBe(true);
    expect(validation.data?.verbose).toBe(false);
  });
});

describe('Git Check - Phase 1 Gate 1 Validation', () => {
  it('should pass P0-1: Subcommand Tree validation', () => {
    const metadata = gitCheckCommand.getMetadata();

    expect(metadata.cli?.path).toEqual(['git', 'check']);

    // Build command tree
    const roots = gitCheckCommand.constructor.buildCommandTree([
      gitCheckCommand as any,
    ]);
    expect(roots).toHaveLength(1);
    expect(roots[0].name()).toBe('git');
  });

  it('should pass P0-3: Lazy Loading validation', () => {
    // Verify handler is not loaded until execution
    expect(gitCheckCommand['handlerLoaded']).toBe(false);

    // Metadata should be available without loading handler
    const metadata = gitCheckCommand.getMetadata();
    expect(metadata.name).toBe('git check');

    // Handler still not loaded
    expect(gitCheckCommand['handlerLoaded']).toBe(false);
  });

  it('should integrate with git command tree', () => {
    // When combined with other git commands, should nest properly
    const roots = gitCheckCommand.constructor.buildCommandTree([
      gitCheckCommand as any,
    ]);

    expect(roots).toHaveLength(1);
    expect(roots[0].name()).toBe('git');

    const gitSubcommands = roots[0].commands;
    expect(gitSubcommands).toHaveLength(1);
    expect(gitSubcommands[0].name()).toBe('check');
  });
});
