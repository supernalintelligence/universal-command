/**
 * Git Command Tree Integration Test
 *
 * Validates that multiple git commands properly nest under a single 'git' root
 */

import { describe, it, expect } from 'vitest';
import { gitCommitCommand } from '../commit';
import { gitMergeCommand } from '../merge';
import { gitPushCommand } from '../push';
import { gitBranchCommand } from '../branch';
import { gitCheckCommand } from '../check';

describe('Git Command Tree - Multi-Command Integration', () => {
  it('should combine commit and merge under single git root', () => {
    // Build command tree with both commands
    const roots = gitCommitCommand.constructor.buildCommandTree([
      gitCommitCommand as any,
      gitMergeCommand as any,
    ]);

    // Should have exactly one root: 'git'
    expect(roots).toHaveLength(1);
    expect(roots[0].name()).toBe('git');

    // Git should have 2 subcommands: commit and merge
    const gitSubcommands = roots[0].commands;
    expect(gitSubcommands).toHaveLength(2);

    const names = gitSubcommands.map((c: any) => c.name());
    expect(names).toContain('commit');
    expect(names).toContain('merge');
  });

  it('should validate commit command in tree', () => {
    const roots = gitCommitCommand.constructor.buildCommandTree([
      gitCommitCommand as any,
      gitMergeCommand as any,
    ]);

    const gitSubcommands = roots[0].commands;
    const commitCmd = gitSubcommands.find((c: any) => c.name() === 'commit');

    expect(commitCmd).toBeDefined();
    expect(commitCmd?.description()).toContain('Safe git commit');

    // Check commit has positional files argument
    const commitArgs = (commitCmd as any)._args;
    expect(commitArgs).toBeDefined();
    expect(commitArgs.some((a: any) => a.name() === 'files')).toBe(true);
  });

  it('should validate merge command in tree', () => {
    const roots = gitCommitCommand.constructor.buildCommandTree([
      gitCommitCommand as any,
      gitMergeCommand as any,
    ]);

    const gitSubcommands = roots[0].commands;
    const mergeCmd = gitSubcommands.find((c: any) => c.name() === 'merge');

    expect(mergeCmd).toBeDefined();
    expect(mergeCmd?.description()).toContain('Safe merge');

    // Check merge has positional branch argument
    const mergeArgs = (mergeCmd as any)._args;
    expect(mergeArgs).toBeDefined();
    expect(mergeArgs.some((a: any) => a.name() === 'branch')).toBe(true);
  });

  it('should combine all 5 P0-1 git commands under single root', () => {
    // Build command tree with all 5 Phase 1 commands
    const roots = gitCommitCommand.constructor.buildCommandTree([
      gitCommitCommand as any,
      gitMergeCommand as any,
      gitPushCommand as any,
      gitBranchCommand as any,
      gitCheckCommand as any,
    ]);

    // Should have exactly one root: 'git'
    expect(roots).toHaveLength(1);
    expect(roots[0].name()).toBe('git');

    // Git should have all 5 subcommands
    const gitSubcommands = roots[0].commands;
    expect(gitSubcommands).toHaveLength(5);

    const names = gitSubcommands.map((c: any) => c.name());
    expect(names).toContain('commit');
    expect(names).toContain('merge');
    expect(names).toContain('push');
    expect(names).toContain('branch');
    expect(names).toContain('check');
  });
});

describe('Git Commands - P0 Feature Validation', () => {
  it('should validate all commands support lazy loading', () => {
    // No handlers should be loaded yet
    expect(gitCommitCommand['handlerLoaded']).toBe(false);
    expect(gitMergeCommand['handlerLoaded']).toBe(false);
    expect(gitPushCommand['handlerLoaded']).toBe(false);
    expect(gitBranchCommand['handlerLoaded']).toBe(false);
    expect(gitCheckCommand['handlerLoaded']).toBe(false);

    // Metadata should be accessible without loading handlers
    const commitMeta = gitCommitCommand.getMetadata();
    const mergeMeta = gitMergeCommand.getMetadata();
    const pushMeta = gitPushCommand.getMetadata();
    const branchMeta = gitBranchCommand.getMetadata();
    const checkMeta = gitCheckCommand.getMetadata();

    expect(commitMeta.name).toBe('git commit');
    expect(mergeMeta.name).toBe('git merge');
    expect(pushMeta.name).toBe('git push');
    expect(branchMeta.name).toBe('git branch');
    expect(checkMeta.name).toBe('git check');

    // Handlers still not loaded
    expect(gitCommitCommand['handlerLoaded']).toBe(false);
    expect(gitMergeCommand['handlerLoaded']).toBe(false);
    expect(gitPushCommand['handlerLoaded']).toBe(false);
    expect(gitBranchCommand['handlerLoaded']).toBe(false);
    expect(gitCheckCommand['handlerLoaded']).toBe(false);
  });

  it('should validate all commands support MCP interface', () => {
    const commitMCP = gitCommitCommand.toMCP();
    const mergeMCP = gitMergeCommand.toMCP();
    const pushMCP = gitPushCommand.toMCP();
    const branchMCP = gitBranchCommand.toMCP();
    const checkMCP = gitCheckCommand.toMCP();

    // All should have MCP tool definitions
    expect(commitMCP.name).toMatch(/git_commit$/);
    expect(mergeMCP.name).toMatch(/git_merge$/);
    expect(pushMCP.name).toMatch(/git_push$/);
    expect(branchMCP.name).toMatch(/git_branch$/);
    expect(checkMCP.name).toMatch(/git_check$/);

    expect(commitMCP.inputSchema).toBeDefined();
    expect(mergeMCP.inputSchema).toBeDefined();
    expect(pushMCP.inputSchema).toBeDefined();
    expect(branchMCP.inputSchema).toBeDefined();
    expect(checkMCP.inputSchema).toBeDefined();
  });

  it('should validate all commands use correct CLI path', () => {
    const commitMeta = gitCommitCommand.getMetadata();
    const mergeMeta = gitMergeCommand.getMetadata();
    const pushMeta = gitPushCommand.getMetadata();
    const branchMeta = gitBranchCommand.getMetadata();
    const checkMeta = gitCheckCommand.getMetadata();

    expect(commitMeta.cli?.path).toEqual(['git', 'commit']);
    expect(mergeMeta.cli?.path).toEqual(['git', 'merge']);
    expect(pushMeta.cli?.path).toEqual(['git', 'push']);
    expect(branchMeta.cli?.path).toEqual(['git', 'branch']);
    expect(checkMeta.cli?.path).toEqual(['git', 'check']);
  });
});
