/**
 * Tests for migrated planning req new command (P0-2)
 *
 * Validates that universal-command implementation maintains compatibility
 * with existing requirement creation
 */

import { describe, it, expect } from 'vitest';
import { planningReqNewCommand } from '../req-new';

describe('Planning Req New (Universal Command)', () => {
  it('should have correct metadata', () => {
    const metadata = planningReqNewCommand.getMetadata();

    expect(metadata.name).toBe('planning req new');
    expect(metadata.description).toContain('Create new requirement');
    expect(metadata.category).toBe('planning');
    expect(metadata.cli?.path).toEqual(['planning', 'req', 'new']);
  });

  it('should validate required parameters', () => {
    // Missing title (required)
    const v1 = planningReqNewCommand.validateArgs({});
    expect(v1.valid).toBe(false);

    // With title
    const v2 = planningReqNewCommand.validateArgs({
      title: 'New Feature Request',
    });
    expect(v2.valid).toBe(true);
    expect(v2.data?.title).toBe('New Feature Request');
  });

  it('should validate optional parameters', () => {
    const v = planningReqNewCommand.validateArgs({
      title: 'Feature',
      epic: 'epic-001',
      category: 'workflow',
      priority: 'high',
      requestType: 'feature',
      feature: 'auth/login',
      tags: 'security,auth',
      status: 'draft',
      assignee: 'alice',
      dryRun: true,
      yes: true,
      noRegister: true,
      userid: 'bob',
      notes: 'Important work',
      verbose: true,
    });

    expect(v.valid).toBe(true);
    expect(v.data?.epic).toBe('epic-001');
    expect(v.data?.category).toBe('workflow');
    expect(v.data?.priority).toBe('high');
    expect(v.data?.requestType).toBe('feature');
    expect(v.data?.feature).toBe('auth/login');
    expect(v.data?.tags).toBe('security,auth');
    expect(v.data?.status).toBe('draft');
    expect(v.data?.assignee).toBe('alice');
    expect(v.data?.dryRun).toBe(true);
    expect(v.data?.yes).toBe(true);
    expect(v.data?.noRegister).toBe(true);
    expect(v.data?.userid).toBe('bob');
    expect(v.data?.notes).toBe('Important work');
    expect(v.data?.verbose).toBe(true);
  });

  it('should generate CLI command correctly', () => {
    const cliCmd = planningReqNewCommand.toCLI();

    expect(cliCmd.name()).toBe('new');
    expect(cliCmd.description()).toContain('Create new requirement');

    // Check positional argument
    const args = (cliCmd as any)._args;
    expect(args).toBeDefined();
    expect(args.some((a: any) => a.name() === 'title')).toBe(true);

    // Check options
    const options = cliCmd.options;
    const optionFlags = options.map((o: any) => o.flags);
    expect(optionFlags.some((f: string) => f.includes('epic'))).toBe(true);
    expect(optionFlags.some((f: string) => f.includes('category'))).toBe(true);
    expect(optionFlags.some((f: string) => f.includes('priority'))).toBe(true);
    // dryRun becomes --dry-run (camelCase conversion)
    expect(optionFlags.some((f: string) => f.match(/dry-?run/i))).toBe(true);
  });

  it('should support MCP interface', () => {
    const mcpTool = planningReqNewCommand.toMCP();

    expect(mcpTool.name).toMatch(/planning_req_new$/);
    expect(mcpTool.description).toContain('Create new requirement');
    expect(mcpTool.inputSchema.properties).toHaveProperty('title');
    expect(mcpTool.inputSchema.properties).toHaveProperty('epic');
    expect(mcpTool.inputSchema.properties).toHaveProperty('priority');
    expect(mcpTool.inputSchema.required).toContain('title');
  });

  it('should preserve default values', () => {
    const validation = planningReqNewCommand.validateArgs({
      title: 'Test Requirement',
    });

    expect(validation.valid).toBe(true);
    expect(validation.data?.dryRun).toBe(false);
    expect(validation.data?.yes).toBe(false);
    expect(validation.data?.noRegister).toBe(false);
    expect(validation.data?.verbose).toBe(false);
  });
});

describe('Planning Req New - Phase 2 Validation', () => {
  it('should pass P0-1: Subcommand Tree validation', () => {
    const metadata = planningReqNewCommand.getMetadata();

    expect(metadata.cli?.path).toEqual(['planning', 'req', 'new']);

    // Build command tree
    const roots = planningReqNewCommand.constructor.buildCommandTree([
      planningReqNewCommand as any,
    ]);
    expect(roots).toHaveLength(1);
    expect(roots[0].name()).toBe('planning');
  });

  it('should pass P0-2: Positional Arguments validation', () => {
    const params = planningReqNewCommand.schema.input.parameters;
    const titleParam = params.find((p) => p.name === 'title');

    expect(titleParam).toBeDefined();
    expect(titleParam?.positional).toBe(true);
    expect(titleParam?.required).toBe(true);
    expect(titleParam?.type).toBe('string');
  });

  it('should pass P0-3: Lazy Loading validation', () => {
    // Verify handler is not loaded until execution
    expect(planningReqNewCommand['handlerLoaded']).toBe(false);

    // Metadata should be available without loading handler
    const metadata = planningReqNewCommand.getMetadata();
    expect(metadata.name).toBe('planning req new');

    // Handler still not loaded
    expect(planningReqNewCommand['handlerLoaded']).toBe(false);
  });
});
