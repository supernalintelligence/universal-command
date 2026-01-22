/**
 * Tests for all test commands (P1-3)
 */

import { describe, it, expect } from 'vitest';
import { testCommand } from '../test';
import { testAuditCommand } from '../audit';

describe('Test Command (Universal Command)', () => {
  it('should have correct metadata', () => {
    const metadata = testCommand.getMetadata();
    expect(metadata.name).toBe('test');
    expect(metadata.cli?.path).toEqual(['test']);
    expect(metadata.category).toBe('testing');
  });

  it('should validate optional parameters', () => {
    // No args is valid (shows help)
    const v1 = testCommand.validateArgs({});
    expect(v1.valid).toBe(true);

    // Action only
    const v2 = testCommand.validateArgs({
      action: 'run',
    });
    expect(v2.valid).toBe(true);

    // Full options
    const v3 = testCommand.validateArgs({
      action: 'run',
      target: 'npm test',
      req: 'REQ-106',
      compliance: true,
      verbose: true,
    });
    expect(v3.valid).toBe(true);
  });

  it('should pass P0-2: Positional Arguments', () => {
    const params = testCommand.schema.input.parameters;

    const actionParam = params.find((p) => p.name === 'action');
    expect(actionParam?.positional).toBe(true);
    expect(actionParam?.required).toBe(false);

    const targetParam = params.find((p) => p.name === 'target');
    expect(targetParam?.positional).toBe(true);
    expect(targetParam?.required).toBe(false);
  });

  it('should pass P0-3: Lazy Loading', () => {
    expect(testCommand['handlerLoaded']).toBe(false);
    const metadata = testCommand.getMetadata();
    expect(metadata.name).toBe('test');
    expect(testCommand['handlerLoaded']).toBe(false);
  });

  it('should support MCP interface', () => {
    const mcpTool = testCommand.toMCP();

    expect(mcpTool.name).toMatch(/test$/);
    expect(mcpTool.description.toLowerCase()).toContain('testing');
    expect(mcpTool.inputSchema.properties).toHaveProperty('action');
    expect(mcpTool.inputSchema.properties).toHaveProperty('req');
    expect(mcpTool.inputSchema.properties).toHaveProperty('compliance');
  });

  it('should have verbose alias', () => {
    const params = testCommand.schema.input.parameters;
    const verboseParam = params.find((p) => p.name === 'verbose');
    expect(verboseParam?.aliases).toContain('v');
  });

  it('should support evidence parameters', () => {
    const params = testCommand.schema.input.parameters;

    const complianceParam = params.find((p) => p.name === 'compliance');
    expect(complianceParam).toBeDefined();
    expect(complianceParam?.type).toBe('boolean');

    const evidenceParam = params.find((p) => p.name === 'evidence');
    expect(evidenceParam).toBeDefined();
    expect(evidenceParam?.description).toContain('Alias for --compliance');
  });

  it('should generate CLI command correctly', () => {
    const cliCmd = testCommand.toCLI();

    expect(cliCmd.name()).toBe('test');

    // Check options
    const options = cliCmd.options;
    const optionFlags = options.map((o: any) => o.flags);

    expect(optionFlags.some((f: string) => f.includes('watch'))).toBe(true);
    expect(optionFlags.some((f: string) => f.includes('coverage'))).toBe(true);
    expect(optionFlags.some((f: string) => f.includes('verbose'))).toBe(true);
    expect(optionFlags.some((f: string) => f.includes('req'))).toBe(true);
    expect(optionFlags.some((f: string) => f.includes('compliance'))).toBe(true);
  });
});

describe('Test Audit Command (Universal Command)', () => {
  it('should have correct metadata', () => {
    const metadata = testAuditCommand.getMetadata();
    expect(metadata.name).toBe('test audit');
    expect(metadata.cli?.path).toEqual(['test', 'audit']);
  });

  it('should validate parameters', () => {
    // No args is valid (default action)
    const v1 = testAuditCommand.validateArgs({});
    expect(v1.valid).toBe(true);

    // Action with options
    const v2 = testAuditCommand.validateArgs({
      action: 'cli-tests',
      fix: true,
      verbose: true,
    });
    expect(v2.valid).toBe(true);
  });

  it('should pass P0-2: Positional Arguments', () => {
    const params = testAuditCommand.schema.input.parameters;
    const actionParam = params.find((p) => p.name === 'action');
    expect(actionParam?.positional).toBe(true);
    expect(actionParam?.default).toBe('traceability');
  });

  it('should pass P0-3: Lazy Loading', () => {
    expect(testAuditCommand['handlerLoaded']).toBe(false);
    const metadata = testAuditCommand.getMetadata();
    expect(metadata.name).toBe('test audit');
    expect(testAuditCommand['handlerLoaded']).toBe(false);
  });

  it('should support MCP interface', () => {
    const mcpTool = testAuditCommand.toMCP();

    expect(mcpTool.name).toMatch(/test_audit$/);
    expect(mcpTool.description.toLowerCase()).toContain('audit');
    expect(mcpTool.inputSchema.properties).toHaveProperty('action');
    expect(mcpTool.inputSchema.properties).toHaveProperty('fix');
  });

  it('should have format options', () => {
    const params = testAuditCommand.schema.input.parameters;
    const formatParam = params.find((p) => p.name === 'format');
    expect(formatParam).toBeDefined();
    expect(formatParam?.default).toBe('table');
  });

  it('should generate CLI command correctly', () => {
    const cliCmd = testAuditCommand.toCLI();

    expect(cliCmd.name()).toBe('audit');

    // Check options
    const options = cliCmd.options;
    const optionFlags = options.map((o: any) => o.flags);

    expect(optionFlags.some((f: string) => f.includes('fix'))).toBe(true);
    expect(optionFlags.some((f: string) => f.match(/dry-?run/i))).toBe(true);
    expect(optionFlags.some((f: string) => f.includes('cosmetic'))).toBe(true);
    expect(optionFlags.some((f: string) => f.includes('format'))).toBe(true);
  });
});

describe('Test Commands - Tree Integration', () => {
  it('should combine test commands under test root', () => {
    const roots = testCommand.constructor.buildCommandTree([
      testCommand as any,
      testAuditCommand as any,
    ]);

    expect(roots).toHaveLength(1);
    expect(roots[0].name()).toBe('test');

    const testSubcommands = roots[0].commands;
    expect(testSubcommands).toHaveLength(1);
    expect(testSubcommands[0].name()).toBe('audit');
  });

  it('should validate all commands support MCP interface', () => {
    const testMCP = testCommand.toMCP();
    const auditMCP = testAuditCommand.toMCP();

    expect(testMCP.name).toMatch(/test$/);
    expect(auditMCP.name).toMatch(/test_audit$/);
  });
});
