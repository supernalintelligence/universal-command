/**
 * Tests for all planning req commands (P0-2)
 */

import { describe, it, expect } from 'vitest';
import { planningReqListCommand } from '../req-list';
import { planningReqShowCommand } from '../req-show';
import { planningReqValidateCommand } from '../req-validate';
import { planningReqGenerateTestsCommand } from '../req-generate-tests';

describe('Planning Req List (Universal Command)', () => {
  it('should have correct metadata', () => {
    const metadata = planningReqListCommand.getMetadata();
    expect(metadata.name).toBe('planning req list');
    expect(metadata.cli?.path).toEqual(['planning', 'req', 'list']);
  });

  it('should validate parameters', () => {
    const v = planningReqListCommand.validateArgs({
      format: 'json',
      epic: 'epic-001',
      verbose: true,
    });
    expect(v.valid).toBe(true);
  });

  it('should pass P0-3: Lazy Loading', () => {
    expect(planningReqListCommand['handlerLoaded']).toBe(false);
    const metadata = planningReqListCommand.getMetadata();
    expect(metadata.name).toBe('planning req list');
    expect(planningReqListCommand['handlerLoaded']).toBe(false);
  });
});

describe('Planning Req Show (Universal Command)', () => {
  it('should have correct metadata', () => {
    const metadata = planningReqShowCommand.getMetadata();
    expect(metadata.name).toBe('planning req show');
    expect(metadata.cli?.path).toEqual(['planning', 'req', 'show']);
  });

  it('should require requirementId', () => {
    const v1 = planningReqShowCommand.validateArgs({});
    expect(v1.valid).toBe(false);

    const v2 = planningReqShowCommand.validateArgs({ requirementId: 'REQ-042' });
    expect(v2.valid).toBe(true);
  });

  it('should pass P0-2: Positional Arguments', () => {
    const params = planningReqShowCommand.schema.input.parameters;
    const idParam = params.find((p) => p.name === 'requirementId');
    expect(idParam?.positional).toBe(true);
    expect(idParam?.required).toBe(true);
  });
});

describe('Planning Req Validate (Universal Command)', () => {
  it('should have correct metadata', () => {
    const metadata = planningReqValidateCommand.getMetadata();
    expect(metadata.name).toBe('planning req validate');
    expect(metadata.cli?.path).toEqual(['planning', 'req', 'validate']);
  });

  it('should validate parameters', () => {
    const v = planningReqValidateCommand.validateArgs({
      requirementId: 'REQ-042',
      content: true,
      naming: true,
      all: true,
    });
    expect(v.valid).toBe(true);
    expect(v.data?.content).toBe(true);
    expect(v.data?.naming).toBe(true);
    expect(v.data?.all).toBe(true);
  });
});

describe('Planning Req Generate Tests (Universal Command)', () => {
  it('should have correct metadata', () => {
    const metadata = planningReqGenerateTestsCommand.getMetadata();
    expect(metadata.name).toBe('planning req generate-tests');
    expect(metadata.cli?.path).toEqual(['planning', 'req', 'generate-tests']);
  });

  it('should require requirementId', () => {
    const v1 = planningReqGenerateTestsCommand.validateArgs({});
    expect(v1.valid).toBe(false);

    const v2 = planningReqGenerateTestsCommand.validateArgs({
      requirementId: 'REQ-042',
      dryRun: true,
    });
    expect(v2.valid).toBe(true);
  });
});

describe('Planning Commands - Tree Integration', () => {
  it('should combine all req commands under planning > req', () => {
    const roots = planningReqListCommand.constructor.buildCommandTree([
      planningReqListCommand as any,
      planningReqShowCommand as any,
      planningReqValidateCommand as any,
      planningReqGenerateTestsCommand as any,
    ]);

    expect(roots).toHaveLength(1);
    expect(roots[0].name()).toBe('planning');

    const planningSubcommands = roots[0].commands;
    expect(planningSubcommands).toHaveLength(1);
    expect(planningSubcommands[0].name()).toBe('req');

    const reqSubcommands = planningSubcommands[0].commands;
    expect(reqSubcommands).toHaveLength(4);

    const names = reqSubcommands.map((c: any) => c.name());
    expect(names).toContain('list');
    expect(names).toContain('show');
    expect(names).toContain('validate');
    expect(names).toContain('generate-tests');
  });

  it('should validate all commands support MCP interface', () => {
    const listMCP = planningReqListCommand.toMCP();
    const showMCP = planningReqShowCommand.toMCP();
    const validateMCP = planningReqValidateCommand.toMCP();
    const generateTestsMCP = planningReqGenerateTestsCommand.toMCP();

    expect(listMCP.name).toMatch(/planning_req_list$/);
    expect(showMCP.name).toMatch(/planning_req_show$/);
    expect(validateMCP.name).toMatch(/planning_req_validate$/);
    expect(generateTestsMCP.name).toMatch(/planning_req_generate_tests$/);
  });
});
