/**
 * Tests for migrated git merge command (P0-1)
 *
 * Validates that universal-command implementation maintains compatibility
 * with existing merge-safe.js behavior
 */

import { describe, it, expect } from 'vitest';
import { gitMergeCommand } from '../merge';

describe('Git Merge (Universal Command)', () => {
  it('should have correct metadata', () => {
    const metadata = gitMergeCommand.getMetadata();

    expect(metadata.name).toBe('git merge');
    expect(metadata.description).toContain('Safe merge');
    expect(metadata.category).toBe('git');
    expect(metadata.cli?.path).toEqual(['git', 'merge']);
  });

  it('should validate parameters', () => {
    // With branch specified
    const v1 = gitMergeCommand.validateArgs({
      branch: 'feature/my-feature',
      autoPush: true,
    });
    expect(v1.valid).toBe(true);
    expect(v1.data?.branch).toBe('feature/my-feature');
    expect(v1.data?.autoPush).toBe(true);

    // Without branch (default to current)
    const v2 = gitMergeCommand.validateArgs({
      deleteLocal: true,
    });
    expect(v2.valid).toBe(true);
    expect(v2.data?.deleteLocal).toBe(true);

    // With aliases
    const v3 = gitMergeCommand.validateArgs({
      push: true, // alias for autoPush
      delete: true, // alias for deleteLocal
    });
    expect(v3.valid).toBe(true);
    expect(v3.data?.push).toBe(true);
    expect(v3.data?.delete).toBe(true);

    // Interactive mode
    const v4 = gitMergeCommand.validateArgs({
      i: true, // alias for interactive
      q: true, // alias for quiet
    });
    expect(v4.valid).toBe(true);
    expect(v4.data?.i).toBe(true);
    expect(v4.data?.q).toBe(true);
  });

  it('should generate CLI command correctly', () => {
    const cliCmd = gitMergeCommand.toCLI();

    expect(cliCmd.name()).toBe('merge');
    expect(cliCmd.description()).toContain('Safe merge');

    // Check positional argument
    const args = (cliCmd as any)._args;
    expect(args).toBeDefined();
    expect(args.some((a: any) => a.name() === 'branch')).toBe(true);

    // Check options
    const options = cliCmd.options;
    const optionFlags = options.map((o: any) => o.flags);
    expect(optionFlags.some((f: string) => f.includes('autoPush'))).toBe(true);
    expect(optionFlags.some((f: string) => f.includes('deleteLocal'))).toBe(true);
    expect(optionFlags.some((f: string) => f.includes('interactive'))).toBe(true);
  });

  it('should support MCP interface', () => {
    const mcpTool = gitMergeCommand.toMCP();

    expect(mcpTool.name).toMatch(/git_merge$/);
    expect(mcpTool.description).toContain('Safe merge');
    expect(mcpTool.inputSchema.properties).toHaveProperty('branch');
    expect(mcpTool.inputSchema.properties).toHaveProperty('autoPush');
  });

  it('should support all legacy flags', () => {
    const params = gitMergeCommand.schema.input.parameters;
    const paramNames = params.map((p) => p.name);

    // Check all legacy flags are preserved
    expect(paramNames).toContain('branch');
    expect(paramNames).toContain('autoPush');
    expect(paramNames).toContain('push');
    expect(paramNames).toContain('deleteLocal');
    expect(paramNames).toContain('delete');
    expect(paramNames).toContain('interactive');
    expect(paramNames).toContain('i');
    expect(paramNames).toContain('quiet');
    expect(paramNames).toContain('q');
    expect(paramNames).toContain('verbose');
  });

  it('should preserve default values', () => {
    const validation = gitMergeCommand.validateArgs({});

    expect(validation.valid).toBe(true);
    expect(validation.data?.autoPush).toBe(false);
    expect(validation.data?.deleteLocal).toBe(false);
    expect(validation.data?.interactive).toBe(false);
    expect(validation.data?.quiet).toBe(false);
    expect(validation.data?.verbose).toBe(true); // default true
  });
});

describe('Git Merge - Phase 1 Gate 1 Validation', () => {
  it('should pass P0-1: Subcommand Tree validation', () => {
    const metadata = gitMergeCommand.getMetadata();

    expect(metadata.cli?.path).toEqual(['git', 'merge']);

    // Build command tree
    const roots = gitMergeCommand.constructor.buildCommandTree([
      gitMergeCommand as any,
    ]);
    expect(roots).toHaveLength(1);
    expect(roots[0].name()).toBe('git');
  });

  it('should pass P0-2: Positional Arguments validation', () => {
    // Optional positional branch argument
    const params = gitMergeCommand.schema.input.parameters;
    const branchParam = params.find((p) => p.name === 'branch');

    expect(branchParam).toBeDefined();
    expect(branchParam?.positional).toBe(true);
    expect(branchParam?.required).toBe(false);
    expect(branchParam?.type).toBe('string');
  });

  it('should pass P0-3: Lazy Loading validation', () => {
    // Verify handler is not loaded until execution
    expect(gitMergeCommand['handlerLoaded']).toBe(false);

    // Metadata should be available without loading handler
    const metadata = gitMergeCommand.getMetadata();
    expect(metadata.name).toBe('git merge');

    // Handler still not loaded
    expect(gitMergeCommand['handlerLoaded']).toBe(false);
  });

  it('should integrate with git command tree', () => {
    // When combined with other git commands, should nest properly
    const roots = gitMergeCommand.constructor.buildCommandTree([
      gitMergeCommand as any,
    ]);

    expect(roots).toHaveLength(1);
    expect(roots[0].name()).toBe('git');

    const gitSubcommands = roots[0].commands;
    expect(gitSubcommands).toHaveLength(1);
    expect(gitSubcommands[0].name()).toBe('merge');
  });
});
