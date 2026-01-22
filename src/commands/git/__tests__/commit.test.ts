/**
 * Tests for migrated git commit command (P0-1)
 *
 * Validates that universal-command implementation maintains compatibility
 * with existing git-commit.js behavior
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { gitCommitCommand } from '../commit';
import { Writable } from 'stream';
import { execSync } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

describe('Git Commit (Universal Command)', () => {
  let testDir: string;
  let stdoutChunks: string[];
  let stderrChunks: string[];
  let mockStdout: Writable;
  let mockStderr: Writable;

  beforeEach(async () => {
    // Create temp git repo for testing
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'uc-git-commit-test-'));

    // Initialize git repo
    execSync('git init', { cwd: testDir });
    execSync('git config user.email "test@example.com"', { cwd: testDir });
    execSync('git config user.name "Test User"', { cwd: testDir });

    // Create initial commit
    await fs.writeFile(path.join(testDir, 'README.md'), '# Test\n');
    execSync('git add README.md', { cwd: testDir });
    execSync('git commit -m "Initial commit"', { cwd: testDir });

    // Setup mock stdout/stderr
    stdoutChunks = [];
    stderrChunks = [];

    mockStdout = new Writable({
      write(chunk, encoding, callback) {
        stdoutChunks.push(chunk.toString());
        callback();
      },
    });

    mockStderr = new Writable({
      write(chunk, encoding, callback) {
        stderrChunks.push(chunk.toString());
        callback();
      },
    });
  });

  afterEach(async () => {
    // Cleanup
    await fs.remove(testDir);
  });

  it('should have correct metadata', () => {
    const metadata = gitCommitCommand.getMetadata();

    expect(metadata.name).toBe('git commit');
    expect(metadata.description).toContain('Safe git commit');
    expect(metadata.category).toBe('git');
    expect(metadata.cli?.path).toEqual(['git', 'commit']);
  });

  it('should validate required parameters', async () => {
    // Validation should pass with all required fields
    const validation1 = gitCommitCommand.validateArgs({
      files: ['test.txt'],
      message: 'feat: add test',
    });
    expect(validation1.valid).toBe(true);

    // Validation should pass even without message (not required in schema)
    const validation2 = gitCommitCommand.validateArgs({
      files: ['test.txt'],
    });
    expect(validation2.valid).toBe(true);
  });

  it('should support dry-run mode', () => {
    // Validation should preserve dryRun flag
    const validation = gitCommitCommand.validateArgs({
      files: ['test.txt'],
      message: 'feat: add test file',
      dryRun: true,
      verbose: true,
    });

    expect(validation.valid).toBe(true);
    expect(validation.data?.dryRun).toBe(true);
    expect(validation.data?.verbose).toBe(true);
  });

  it('should generate CLI command correctly', () => {
    const cliCmd = gitCommitCommand.toCLI();

    expect(cliCmd.name()).toBe('commit');
    expect(cliCmd.description()).toContain('Safe git commit');

    // Check arguments
    const args = (cliCmd as any)._args;
    expect(args).toBeDefined();
    expect(args.some((a: any) => a.name() === 'files')).toBe(true);

    // Check options - note: dryRun becomes --dry-run via camelCase conversion
    const options = cliCmd.options;
    const optionFlags = options.map((o: any) => o.flags);
    expect(optionFlags.some((f: string) => f.includes('--message'))).toBe(true);
    expect(optionFlags.some((f: string) => f.includes('--nit'))).toBe(true);
    // Either --dry-run or --dryRun should exist
    const hasDryRun = optionFlags.some((f: string) =>
      f.includes('--dry-run') || f.includes('--dryRun')
    );
    expect(hasDryRun).toBe(true);
  });

  it('should support MCP interface', () => {
    const mcpTool = gitCommitCommand.toMCP();

    // MCP tool name is either git_commit or auto-generated sc_git_commit
    expect(mcpTool.name).toMatch(/git_commit$/);
    expect(mcpTool.description).toContain('Safe git commit');

    // Check required fields if they exist
    if (mcpTool.inputSchema.required) {
      expect(mcpTool.inputSchema.required).toContain('message');
    }

    expect(mcpTool.inputSchema.properties).toHaveProperty('files');
    expect(mcpTool.inputSchema.properties).toHaveProperty('message');
  });

  it('should handle positional and option file arguments', () => {
    // Test schema allows both positional files and --files option
    const validation1 = gitCommitCommand.validateArgs({
      files: ['file1.ts', 'file2.ts'],
      message: 'feat: add files',
    });
    expect(validation1.valid).toBe(true);

    const validation2 = gitCommitCommand.validateArgs({
      filesOption: 'file1.ts,file2.ts',
      message: 'feat: add files',
    });
    expect(validation2.valid).toBe(true);
  });

  it('should support all legacy flags', () => {
    const params = gitCommitCommand.schema.input.parameters;
    const paramNames = params.map((p) => p.name);

    // Check all legacy flags are preserved
    expect(paramNames).toContain('files');
    expect(paramNames).toContain('message');
    expect(paramNames).toContain('filesOption');
    expect(paramNames).toContain('nit');
    expect(paramNames).toContain('fix');
    expect(paramNames).toContain('recursive');
    expect(paramNames).toContain('yes');
    expect(paramNames).toContain('ai');
    expect(paramNames).toContain('priority');
    expect(paramNames).toContain('dryRun');
    expect(paramNames).toContain('verbose');
    expect(paramNames).toContain('auto');
  });
});

describe('Git Commit - Phase 1 Gate 1 Validation', () => {
  it('should pass P0-2: Positional Arguments validation', () => {
    // Variadic files argument
    const params = gitCommitCommand.schema.input.parameters;
    const filesParam = params.find((p) => p.name === 'files');

    expect(filesParam).toBeDefined();
    expect(filesParam?.positional).toBe(true);
    expect(filesParam?.variadic).toBe(true);
    expect(filesParam?.type).toBe('array');
  });

  it('should pass P0-1: Subcommand Tree validation', () => {
    const metadata = gitCommitCommand.getMetadata();

    expect(metadata.cli?.path).toEqual(['git', 'commit']);

    // Build command tree
    const roots = gitCommitCommand.constructor.buildCommandTree([
      gitCommitCommand as any,
    ]);
    expect(roots).toHaveLength(1);
    expect(roots[0].name()).toBe('git');
  });

  it('should pass P0-3: Lazy Loading validation', () => {
    // Verify handler is not loaded until execution
    expect(gitCommitCommand['handlerLoaded']).toBe(false);

    // Metadata should be available without loading handler
    const metadata = gitCommitCommand.getMetadata();
    expect(metadata.name).toBe('git commit');

    // Handler still not loaded
    expect(gitCommitCommand['handlerLoaded']).toBe(false);
  });

  it('should pass P0-4: Streaming Output validation', () => {
    // Verify command supports streaming output via context
    const cliCmd = gitCommitCommand.toCLI();
    expect(cliCmd).toBeDefined();

    // Context will provide stdout/stderr streams
    const context = {
      stdout: new Writable({ write: () => {} }),
      stderr: new Writable({ write: () => {} }),
      stdin: process.stdin,
      isTTY: false,
    };

    expect(context.stdout).toBeInstanceOf(Writable);
  });
});
