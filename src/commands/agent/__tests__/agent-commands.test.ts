/**
 * Tests for all agent commands (P2-4)
 */

import { describe, it, expect } from 'vitest';
import { agentStatusCommand } from '../status';
import { agentAssignCommand } from '../assign';
import { agentUnassignCommand } from '../unassign';

describe('Agent Status Command (Universal Command)', () => {
  it('should have correct metadata', () => {
    const metadata = agentStatusCommand.getMetadata();
    expect(metadata.name).toBe('agent status');
    expect(metadata.cli?.path).toEqual(['agent', 'status']);
    expect(metadata.category).toBe('agent');
  });

  it('should validate no parameters', () => {
    const v1 = agentStatusCommand.validateArgs({});
    expect(v1.valid).toBe(true);
  });

  it('should pass P0-3: Lazy Loading', () => {
    expect(agentStatusCommand['handlerLoaded']).toBe(false);
    const metadata = agentStatusCommand.getMetadata();
    expect(metadata.name).toBe('agent status');
    expect(agentStatusCommand['handlerLoaded']).toBe(false);
  });

  it('should support MCP interface', () => {
    const mcpTool = agentStatusCommand.toMCP();

    expect(mcpTool.name).toMatch(/agent_status$/);
    expect(mcpTool.description.toLowerCase()).toContain('agent');
    expect(mcpTool.inputSchema.properties).toBeDefined();
  });

  it('should generate CLI command correctly', () => {
    const cliCmd = agentStatusCommand.toCLI();
    expect(cliCmd.name()).toBe('status');
  });
});

describe('Agent Assign Command (Universal Command)', () => {
  it('should have correct metadata', () => {
    const metadata = agentAssignCommand.getMetadata();
    expect(metadata.name).toBe('agent assign');
    expect(metadata.cli?.path).toEqual(['agent', 'assign']);
  });

  it('should validate parameters', () => {
    // Missing required name
    const v1 = agentAssignCommand.validateArgs({});
    expect(v1.valid).toBe(false);

    // With required name
    const v2 = agentAssignCommand.validateArgs({
      name: 'my-feature',
    });
    expect(v2.valid).toBe(true);

    // With optional requirement
    const v3 = agentAssignCommand.validateArgs({
      name: 'my-feature',
      requirement: 'REQ-042',
    });
    expect(v3.valid).toBe(true);
  });

  it('should pass P0-2: Positional Arguments', () => {
    const params = agentAssignCommand.schema.input.parameters;
    const nameParam = params.find((p) => p.name === 'name');
    expect(nameParam?.positional).toBe(true);
    expect(nameParam?.required).toBe(true);
  });

  it('should pass P0-3: Lazy Loading', () => {
    expect(agentAssignCommand['handlerLoaded']).toBe(false);
    const metadata = agentAssignCommand.getMetadata();
    expect(metadata.name).toBe('agent assign');
    expect(agentAssignCommand['handlerLoaded']).toBe(false);
  });

  it('should support MCP interface', () => {
    const mcpTool = agentAssignCommand.toMCP();

    expect(mcpTool.name).toMatch(/agent_assign$/);
    expect(mcpTool.description.toLowerCase()).toContain('assign');
    expect(mcpTool.inputSchema.properties).toHaveProperty('name');
    expect(mcpTool.inputSchema.required).toContain('name');
  });

  it('should have requirement alias', () => {
    const params = agentAssignCommand.schema.input.parameters;
    const reqParam = params.find((p) => p.name === 'requirement');
    expect(reqParam?.aliases).toContain('r');
  });

  it('should generate CLI command correctly', () => {
    const cliCmd = agentAssignCommand.toCLI();

    expect(cliCmd.name()).toBe('assign');

    // Check options
    const options = cliCmd.options;
    const optionFlags = options.map((o: any) => o.flags);

    expect(optionFlags.some((f: string) => f.includes('requirement'))).toBe(true);
  });
});

describe('Agent Unassign Command (Universal Command)', () => {
  it('should have correct metadata', () => {
    const metadata = agentUnassignCommand.getMetadata();
    expect(metadata.name).toBe('agent unassign');
    expect(metadata.cli?.path).toEqual(['agent', 'unassign']);
  });

  it('should validate parameters', () => {
    // No args is valid
    const v1 = agentUnassignCommand.validateArgs({});
    expect(v1.valid).toBe(true);

    // With remove flag
    const v2 = agentUnassignCommand.validateArgs({
      remove: true,
    });
    expect(v2.valid).toBe(true);

    // With keep flag
    const v3 = agentUnassignCommand.validateArgs({
      keep: true,
    });
    expect(v3.valid).toBe(true);
  });

  it('should pass P0-3: Lazy Loading', () => {
    expect(agentUnassignCommand['handlerLoaded']).toBe(false);
    const metadata = agentUnassignCommand.getMetadata();
    expect(metadata.name).toBe('agent unassign');
    expect(agentUnassignCommand['handlerLoaded']).toBe(false);
  });

  it('should support MCP interface', () => {
    const mcpTool = agentUnassignCommand.toMCP();

    expect(mcpTool.name).toMatch(/agent_unassign$/);
    expect(mcpTool.description.toLowerCase()).toContain('unassign');
    expect(mcpTool.inputSchema.properties).toHaveProperty('remove');
    expect(mcpTool.inputSchema.properties).toHaveProperty('keep');
  });

  it('should generate CLI command correctly', () => {
    const cliCmd = agentUnassignCommand.toCLI();

    expect(cliCmd.name()).toBe('unassign');

    // Check options
    const options = cliCmd.options;
    const optionFlags = options.map((o: any) => o.flags);

    expect(optionFlags.some((f: string) => f.includes('remove'))).toBe(true);
    expect(optionFlags.some((f: string) => f.includes('keep'))).toBe(true);
  });
});

describe('Agent Commands - Tree Integration', () => {
  it('should combine agent commands under agent root', () => {
    const roots = agentStatusCommand.constructor.buildCommandTree([
      agentStatusCommand as any,
      agentAssignCommand as any,
      agentUnassignCommand as any,
    ]);

    expect(roots).toHaveLength(1);
    expect(roots[0].name()).toBe('agent');

    const agentSubcommands = roots[0].commands;
    expect(agentSubcommands).toHaveLength(3);

    const subcommandNames = agentSubcommands.map((cmd: any) => cmd.name());
    expect(subcommandNames).toContain('status');
    expect(subcommandNames).toContain('assign');
    expect(subcommandNames).toContain('unassign');
  });

  it('should validate all commands support MCP interface', () => {
    const statusMCP = agentStatusCommand.toMCP();
    const assignMCP = agentAssignCommand.toMCP();
    const unassignMCP = agentUnassignCommand.toMCP();

    expect(statusMCP.name).toMatch(/agent_status$/);
    expect(assignMCP.name).toMatch(/agent_assign$/);
    expect(unassignMCP.name).toMatch(/agent_unassign$/);
  });
});
