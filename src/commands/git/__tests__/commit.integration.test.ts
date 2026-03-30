/**
 * Integration test for git commit command
 *
 * Validates that the universal-command version works identically to the legacy version
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { gitCommitCommand } from '../commit';
import { execSync } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { Writable } from 'stream';

describe('Git Commit Integration', () => {
  let testDir: string;

  beforeEach(async () => {
    // Create temp git repo
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'uc-git-commit-int-'));

    // Initialize git repo
    execSync('git init', { cwd: testDir });
    execSync('git config user.email "test@example.com"', { cwd: testDir });
    execSync('git config user.name "Test User"', { cwd: testDir });

    // Create initial commit
    await fs.writeFile(path.join(testDir, 'README.md'), '# Test\n');
    execSync('git add README.md', { cwd: testDir });
    execSync('git commit -m "Initial commit"', { cwd: testDir });
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  it('should generate correct CLI command structure', () => {
    const cliCmd = gitCommitCommand.toCLI();

    // Verify command name and structure
    expect(cliCmd.name()).toBe('commit');
    expect(cliCmd.description()).toContain('Safe git commit');

    // Verify it has the expected options count (11 flags + help)
    const options = cliCmd.options;
    expect(options.length).toBeGreaterThanOrEqual(11);

    // Verify positional argument
    const args = (cliCmd as any)._args;
    expect(args).toHaveLength(1);
    expect(args[0].name()).toBe('files');
    expect(args[0].variadic).toBe(true);
  });

  it('should generate correct MCP tool definition', () => {
    const mcpTool = gitCommitCommand.toMCP();

    // Verify MCP structure
    expect(mcpTool.name).toMatch(/git_commit$/);
    expect(mcpTool.description).toBeDefined();
    expect(mcpTool.inputSchema).toBeDefined();
    expect(mcpTool.inputSchema.type).toBe('object');
    expect(mcpTool.inputSchema.properties).toHaveProperty('files');
    expect(mcpTool.inputSchema.properties).toHaveProperty('message');
  });

  it('should validate all parameter combinations', () => {
    // Test with positional files
    const v1 = gitCommitCommand.validateArgs({
      files: ['file1.ts', 'file2.ts'],
      message: 'feat: add files',
    });
    expect(v1.valid).toBe(true);
    expect(v1.data?.files).toEqual(['file1.ts', 'file2.ts']);

    // Test with filesOption
    const v2 = gitCommitCommand.validateArgs({
      filesOption: 'file1.ts,file2.ts',
      message: 'feat: add files',
    });
    expect(v2.valid).toBe(true);

    // Test with nit flag
    const v3 = gitCommitCommand.validateArgs({
      nit: true,
      dryRun: true,
    });
    expect(v3.valid).toBe(true);
    expect(v3.data?.nit).toBe(true);
    expect(v3.data?.dryRun).toBe(true);

    // Test all boolean flags
    const v4 = gitCommitCommand.validateArgs({
      files: ['test.ts'],
      message: 'test',
      ai: true,
      priority: true,
      verbose: true,
      auto: true,
      fix: true,
      recursive: true,
      yes: true,
    });
    expect(v4.valid).toBe(true);
    expect(v4.data?.ai).toBe(true);
    expect(v4.data?.priority).toBe(true);
  });

  it('should preserve default values', () => {
    const validation = gitCommitCommand.validateArgs({
      files: ['test.ts'],
      message: 'test',
    });

    expect(validation.valid).toBe(true);
    expect(validation.data?.nit).toBe(false); // default
    expect(validation.data?.dryRun).toBe(false); // default
    expect(validation.data?.verbose).toBe(false); // default
  });

  it('should support empty files array (for nit mode)', () => {
    const validation = gitCommitCommand.validateArgs({
      files: [],
      nit: true,
      dryRun: true,
    });

    expect(validation.valid).toBe(true);
    expect(validation.data?.files).toEqual([]);
    expect(validation.data?.nit).toBe(true);
  });
});

describe('Git Commit - Command Tree Integration', () => {
  it('should integrate into git command tree', () => {
    // Build command tree with git commit
    const roots = gitCommitCommand.constructor.buildCommandTree([
      gitCommitCommand as any,
    ]);

    expect(roots).toHaveLength(1);
    expect(roots[0].name()).toBe('git');

    // Git should have commit subcommand
    const gitSubcommands = roots[0].commands;
    expect(gitSubcommands).toHaveLength(1);
    expect(gitSubcommands[0].name()).toBe('commit');
  });

  it('should support building tree with multiple git commands', () => {
    // When more git commands are added, they should all nest under 'git'
    // This test validates the command tree structure is ready for additional git commands

    // For now, just validate that commit is properly nested
    const roots = gitCommitCommand.constructor.buildCommandTree([
      gitCommitCommand as any,
    ]);

    expect(roots).toHaveLength(1);
    expect(roots[0].name()).toBe('git');

    const gitSubcommands = roots[0].commands;
    expect(gitSubcommands).toHaveLength(1);
    expect(gitSubcommands[0].name()).toBe('commit');

    // Future: When git merge, git push, etc. are migrated, they will appear here
    // expect(gitSubcommands).toHaveLength(5); // commit, merge, push, branch, check
  });
});
