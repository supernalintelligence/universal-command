/**
 * Tests for all WIP registry commands (P2-5)
 */

import { describe, it, expect } from 'vitest';
import { wipRegisterCommand } from '../wip-register';
import { wipUnregisterCommand } from '../wip-unregister';
import { wipListCommand } from '../wip-list';
import { wipStatusCommand } from '../wip-status';
import { wipCleanupCommand } from '../wip-cleanup';

describe('Workflow WIP Register Command (Universal Command)', () => {
  it('should have correct metadata', () => {
    const metadata = wipRegisterCommand.getMetadata();
    expect(metadata.name).toBe('workflow wip register');
    expect(metadata.cli?.path).toEqual(['workflow', 'wip', 'register']);
    expect(metadata.category).toBe('workflow');
  });

  it('should validate parameters', () => {
    // Missing required file
    const v1 = wipRegisterCommand.validateArgs({});
    expect(v1.valid).toBe(false);

    // Missing required feature
    const v2 = wipRegisterCommand.validateArgs({ file: 'test.ts' });
    expect(v2.valid).toBe(false);

    // Missing required requirement
    const v3 = wipRegisterCommand.validateArgs({
      file: 'test.ts',
      feature: 'my-feature',
    });
    expect(v3.valid).toBe(false);

    // All required parameters
    const v4 = wipRegisterCommand.validateArgs({
      file: 'test.ts',
      feature: 'my-feature',
      requirement: 'REQ-042',
    });
    expect(v4.valid).toBe(true);

    // With optional parameters
    const v5 = wipRegisterCommand.validateArgs({
      file: 'test.ts',
      feature: 'my-feature',
      requirement: 'REQ-042',
      reason: 'Testing',
      notes: 'Some notes',
      userid: 'alice',
      addComment: true,
      autoCleanup: false,
    });
    expect(v5.valid).toBe(true);
  });

  it('should pass P0-2: Positional Arguments', () => {
    const params = wipRegisterCommand.schema.input.parameters;
    const fileParam = params.find((p) => p.name === 'file');
    expect(fileParam?.positional).toBe(true);
    expect(fileParam?.required).toBe(true);
  });

  it('should pass P0-3: Lazy Loading', () => {
    expect(wipRegisterCommand['handlerLoaded']).toBe(false);
    const metadata = wipRegisterCommand.getMetadata();
    expect(metadata.name).toBe('workflow wip register');
    expect(wipRegisterCommand['handlerLoaded']).toBe(false);
  });

  it('should support MCP interface', () => {
    const mcpTool = wipRegisterCommand.toMCP();

    expect(mcpTool.name).toMatch(/workflow_wip_register$/);
    expect(mcpTool.description.toLowerCase()).toContain('register');
    expect(mcpTool.inputSchema.properties).toHaveProperty('file');
    expect(mcpTool.inputSchema.properties).toHaveProperty('feature');
    expect(mcpTool.inputSchema.properties).toHaveProperty('requirement');
    expect(mcpTool.inputSchema.required).toContain('file');
    expect(mcpTool.inputSchema.required).toContain('feature');
    expect(mcpTool.inputSchema.required).toContain('requirement');
  });

  it('should generate CLI command correctly', () => {
    const cliCmd = wipRegisterCommand.toCLI();
    expect(cliCmd.name()).toBe('register');

    const options = cliCmd.options;
    const optionFlags = options.map((o: any) => o.flags);

    expect(optionFlags.some((f: string) => f.includes('feature'))).toBe(true);
    expect(optionFlags.some((f: string) => f.includes('requirement'))).toBe(true);
    expect(optionFlags.some((f: string) => f.includes('reason'))).toBe(true);
    expect(optionFlags.some((f: string) => f.includes('addComment'))).toBe(true);
  });
});

describe('Workflow WIP Unregister Command (Universal Command)', () => {
  it('should have correct metadata', () => {
    const metadata = wipUnregisterCommand.getMetadata();
    expect(metadata.name).toBe('workflow wip unregister');
    expect(metadata.cli?.path).toEqual(['workflow', 'wip', 'unregister']);
  });

  it('should validate parameters', () => {
    // Missing required file
    const v1 = wipUnregisterCommand.validateArgs({});
    expect(v1.valid).toBe(false);

    // With required file
    const v2 = wipUnregisterCommand.validateArgs({ file: 'test.ts' });
    expect(v2.valid).toBe(true);

    // With quiet flag
    const v3 = wipUnregisterCommand.validateArgs({ file: 'test.ts', quiet: true });
    expect(v3.valid).toBe(true);
  });

  it('should pass P0-2: Positional Arguments', () => {
    const params = wipUnregisterCommand.schema.input.parameters;
    const fileParam = params.find((p) => p.name === 'file');
    expect(fileParam?.positional).toBe(true);
    expect(fileParam?.required).toBe(true);
  });

  it('should pass P0-3: Lazy Loading', () => {
    expect(wipUnregisterCommand['handlerLoaded']).toBe(false);
    const metadata = wipUnregisterCommand.getMetadata();
    expect(metadata.name).toBe('workflow wip unregister');
    expect(wipUnregisterCommand['handlerLoaded']).toBe(false);
  });

  it('should support MCP interface', () => {
    const mcpTool = wipUnregisterCommand.toMCP();

    expect(mcpTool.name).toMatch(/workflow_wip_unregister$/);
    expect(mcpTool.description.toLowerCase()).toContain('unregister');
    expect(mcpTool.inputSchema.properties).toHaveProperty('file');
    expect(mcpTool.inputSchema.required).toContain('file');
  });

  it('should generate CLI command correctly', () => {
    const cliCmd = wipUnregisterCommand.toCLI();
    expect(cliCmd.name()).toBe('unregister');

    const options = cliCmd.options;
    const optionFlags = options.map((o: any) => o.flags);

    expect(optionFlags.some((f: string) => f.includes('quiet'))).toBe(true);
  });
});

describe('Workflow WIP List Command (Universal Command)', () => {
  it('should have correct metadata', () => {
    const metadata = wipListCommand.getMetadata();
    expect(metadata.name).toBe('workflow wip list');
    expect(metadata.cli?.path).toEqual(['workflow', 'wip', 'list']);
  });

  it('should validate parameters', () => {
    // No args is valid
    const v1 = wipListCommand.validateArgs({});
    expect(v1.valid).toBe(true);

    // With filters
    const v2 = wipListCommand.validateArgs({
      olderThan: '7d',
      userid: 'alice',
      me: true,
      unassigned: false,
      pathsOnly: true,
    });
    expect(v2.valid).toBe(true);
  });

  it('should pass P0-3: Lazy Loading', () => {
    expect(wipListCommand['handlerLoaded']).toBe(false);
    const metadata = wipListCommand.getMetadata();
    expect(metadata.name).toBe('workflow wip list');
    expect(wipListCommand['handlerLoaded']).toBe(false);
  });

  it('should support MCP interface', () => {
    const mcpTool = wipListCommand.toMCP();

    expect(mcpTool.name).toMatch(/workflow_wip_list$/);
    expect(mcpTool.description.toLowerCase()).toContain('list');
    expect(mcpTool.inputSchema.properties).toHaveProperty('olderThan');
    expect(mcpTool.inputSchema.properties).toHaveProperty('userid');
    expect(mcpTool.inputSchema.properties).toHaveProperty('pathsOnly');
  });

  it('should generate CLI command correctly', () => {
    const cliCmd = wipListCommand.toCLI();
    expect(cliCmd.name()).toBe('list');

    const options = cliCmd.options;
    const optionFlags = options.map((o: any) => o.flags);

    expect(optionFlags.some((f: string) => f.includes('olderThan'))).toBe(true);
    expect(optionFlags.some((f: string) => f.includes('userid'))).toBe(true);
    expect(optionFlags.some((f: string) => f.includes('me'))).toBe(true);
  });
});

describe('Workflow WIP Status Command (Universal Command)', () => {
  it('should have correct metadata', () => {
    const metadata = wipStatusCommand.getMetadata();
    expect(metadata.name).toBe('workflow wip status');
    expect(metadata.cli?.path).toEqual(['workflow', 'wip', 'status']);
  });

  it('should validate no parameters', () => {
    const v1 = wipStatusCommand.validateArgs({});
    expect(v1.valid).toBe(true);
  });

  it('should pass P0-3: Lazy Loading', () => {
    expect(wipStatusCommand['handlerLoaded']).toBe(false);
    const metadata = wipStatusCommand.getMetadata();
    expect(metadata.name).toBe('workflow wip status');
    expect(wipStatusCommand['handlerLoaded']).toBe(false);
  });

  it('should support MCP interface', () => {
    const mcpTool = wipStatusCommand.toMCP();

    expect(mcpTool.name).toMatch(/workflow_wip_status$/);
    expect(mcpTool.description.toLowerCase()).toContain('status');
    expect(mcpTool.inputSchema.properties).toBeDefined();
  });

  it('should generate CLI command correctly', () => {
    const cliCmd = wipStatusCommand.toCLI();
    expect(cliCmd.name()).toBe('status');
  });
});

describe('Workflow WIP Cleanup Command (Universal Command)', () => {
  it('should have correct metadata', () => {
    const metadata = wipCleanupCommand.getMetadata();
    expect(metadata.name).toBe('workflow wip cleanup');
    expect(metadata.cli?.path).toEqual(['workflow', 'wip', 'cleanup']);
  });

  it('should validate parameters', () => {
    // No args is valid (uses defaults)
    const v1 = wipCleanupCommand.validateArgs({});
    expect(v1.valid).toBe(true);

    // With options
    const v2 = wipCleanupCommand.validateArgs({
      olderThan: '14d',
      dryRun: true,
      force: false,
    });
    expect(v2.valid).toBe(true);
  });

  it('should pass P0-3: Lazy Loading', () => {
    expect(wipCleanupCommand['handlerLoaded']).toBe(false);
    const metadata = wipCleanupCommand.getMetadata();
    expect(metadata.name).toBe('workflow wip cleanup');
    expect(wipCleanupCommand['handlerLoaded']).toBe(false);
  });

  it('should support MCP interface', () => {
    const mcpTool = wipCleanupCommand.toMCP();

    expect(mcpTool.name).toMatch(/workflow_wip_cleanup$/);
    expect(mcpTool.description.toLowerCase()).toContain('clean');
    expect(mcpTool.inputSchema.properties).toHaveProperty('olderThan');
    expect(mcpTool.inputSchema.properties).toHaveProperty('dryRun');
    expect(mcpTool.inputSchema.properties).toHaveProperty('force');
  });

  it('should have default values', () => {
    const params = wipCleanupCommand.schema.input.parameters;

    const olderThanParam = params.find((p) => p.name === 'olderThan');
    expect(olderThanParam?.default).toBe('7d');

    const dryRunParam = params.find((p) => p.name === 'dryRun');
    expect(dryRunParam?.default).toBe(false);
  });

  it('should generate CLI command correctly', () => {
    const cliCmd = wipCleanupCommand.toCLI();
    expect(cliCmd.name()).toBe('cleanup');

    const options = cliCmd.options;
    const optionFlags = options.map((o: any) => o.flags);

    expect(optionFlags.some((f: string) => f.includes('olderThan'))).toBe(true);
    expect(optionFlags.some((f: string) => f.match(/dry-?run/i))).toBe(true);
    expect(optionFlags.some((f: string) => f.includes('force'))).toBe(true);
  });
});

describe('Workflow WIP Commands - Tree Integration', () => {
  it('should combine WIP commands under workflow > wip root', () => {
    const roots = wipRegisterCommand.constructor.buildCommandTree([
      wipRegisterCommand as any,
      wipUnregisterCommand as any,
      wipListCommand as any,
      wipStatusCommand as any,
      wipCleanupCommand as any,
    ]);

    expect(roots).toHaveLength(1);
    expect(roots[0].name()).toBe('workflow');

    const workflowSubcommands = roots[0].commands;
    expect(workflowSubcommands).toHaveLength(1);
    expect(workflowSubcommands[0].name()).toBe('wip');

    const wipSubcommands = workflowSubcommands[0].commands;
    expect(wipSubcommands).toHaveLength(5);

    const subcommandNames = wipSubcommands.map((cmd: any) => cmd.name());
    expect(subcommandNames).toContain('register');
    expect(subcommandNames).toContain('unregister');
    expect(subcommandNames).toContain('list');
    expect(subcommandNames).toContain('status');
    expect(subcommandNames).toContain('cleanup');
  });

  it('should validate all commands support MCP interface', () => {
    const registerMCP = wipRegisterCommand.toMCP();
    const unregisterMCP = wipUnregisterCommand.toMCP();
    const listMCP = wipListCommand.toMCP();
    const statusMCP = wipStatusCommand.toMCP();
    const cleanupMCP = wipCleanupCommand.toMCP();

    expect(registerMCP.name).toMatch(/workflow_wip_register$/);
    expect(unregisterMCP.name).toMatch(/workflow_wip_unregister$/);
    expect(listMCP.name).toMatch(/workflow_wip_list$/);
    expect(statusMCP.name).toMatch(/workflow_wip_status$/);
    expect(cleanupMCP.name).toMatch(/workflow_wip_cleanup$/);
  });
});
