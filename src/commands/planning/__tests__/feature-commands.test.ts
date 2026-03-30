import { describe, it, expect } from 'vitest';
import { featureAuditCommand } from '../feature-audit';
import { featureCreateCommand } from '../feature-create';
import { featureMoveCommand } from '../feature-move';

describe('Planning Feature Audit Command (Universal Command)', () => {
  it('should have correct metadata', () => {
    const metadata = featureAuditCommand.getMetadata();
    expect(metadata.name).toBe('planning feature audit');
    expect(metadata.category).toBe('planning');
    expect(metadata.description.toLowerCase()).toContain('audit');
  });

  it('should validate parameters', () => {
    // Optional positional parameter - all combinations should be valid
    const v1 = featureAuditCommand.validateArgs({});
    expect(v1.valid).toBe(true);

    const v2 = featureAuditCommand.validateArgs({ featureId: 'my-feature' });
    expect(v2.valid).toBe(true);

    const v3 = featureAuditCommand.validateArgs({ verbose: true });
    expect(v3.valid).toBe(true);
  });

  it('should pass P0-2: Positional Arguments', () => {
    const metadata = featureAuditCommand.getMetadata();
    const params = metadata.input.parameters;
    const featureIdParam = params.find((p) => p.name === 'featureId');
    expect(featureIdParam).toBeDefined();
    expect(featureIdParam?.positional).toBe(true);
    expect(featureIdParam?.required).toBe(false);
  });

  it('should pass P0-3: Lazy Loading', () => {
    expect(featureAuditCommand['handlerLoaded']).toBe(false);
    const metadata = featureAuditCommand.getMetadata();
    expect(metadata.name).toBe('planning feature audit');
    expect(featureAuditCommand['handlerLoaded']).toBe(false);
  });

  it('should support MCP interface', () => {
    const mcpTool = featureAuditCommand.toMCP();
    expect(mcpTool.name).toMatch(/planning_feature_audit$/);
    expect(mcpTool.description.toLowerCase()).toContain('audit');
  });

  it('should generate CLI command correctly', () => {
    const cliCmd = featureAuditCommand.toCLI();
    expect(cliCmd.name()).toBe('audit');
  });
});

describe('Planning Feature Create Command (Universal Command)', () => {
  it('should have correct metadata', () => {
    const metadata = featureCreateCommand.getMetadata();
    expect(metadata.name).toBe('planning feature create');
    expect(metadata.category).toBe('planning');
    expect(metadata.description.toLowerCase()).toContain('create');
  });

  it('should validate parameters', () => {
    // Missing required parameters should fail
    const v1 = featureCreateCommand.validateArgs({});
    expect(v1.valid).toBe(false);

    const v2 = featureCreateCommand.validateArgs({ id: 'my-feature' });
    expect(v2.valid).toBe(false);

    // All required parameters should pass
    const v3 = featureCreateCommand.validateArgs({
      id: 'my-feature',
      domain: 'my-domain',
    });
    expect(v3.valid).toBe(true);

    // Optional parameters should work
    const v4 = featureCreateCommand.validateArgs({
      id: 'my-feature',
      domain: 'my-domain',
      title: 'My Feature',
      epic: 'my-epic',
    });
    expect(v4.valid).toBe(true);
  });

  it('should pass P0-2: Positional Arguments', () => {
    // This command uses required named parameters (not positional)
    const metadata = featureCreateCommand.getMetadata();
    const params = metadata.input.parameters;
    const idParam = params.find((p) => p.name === 'id');
    const domainParam = params.find((p) => p.name === 'domain');

    expect(idParam).toBeDefined();
    expect(idParam?.required).toBe(true);
    expect(idParam?.positional).toBeFalsy(); // Not positional

    expect(domainParam).toBeDefined();
    expect(domainParam?.required).toBe(true);
    expect(domainParam?.positional).toBeFalsy(); // Not positional
  });

  it('should pass P0-3: Lazy Loading', () => {
    expect(featureCreateCommand['handlerLoaded']).toBe(false);
    const metadata = featureCreateCommand.getMetadata();
    expect(metadata.name).toBe('planning feature create');
    expect(featureCreateCommand['handlerLoaded']).toBe(false);
  });

  it('should support MCP interface', () => {
    const mcpTool = featureCreateCommand.toMCP();
    expect(mcpTool.name).toMatch(/planning_feature_create$/);
    expect(mcpTool.description.toLowerCase()).toContain('create');
  });

  it('should generate CLI command correctly', () => {
    const cliCmd = featureCreateCommand.toCLI();
    expect(cliCmd.name()).toBe('create');
  });
});

describe('Planning Feature Move Command (Universal Command)', () => {
  it('should have correct metadata', () => {
    const metadata = featureMoveCommand.getMetadata();
    expect(metadata.name).toBe('planning feature move');
    expect(metadata.category).toBe('planning');
    expect(metadata.description.toLowerCase()).toContain('move');
  });

  it('should validate parameters', () => {
    // Missing required parameters should fail
    const v1 = featureMoveCommand.validateArgs({});
    expect(v1.valid).toBe(false);

    const v2 = featureMoveCommand.validateArgs({ featureId: 'my-feature' });
    expect(v2.valid).toBe(false);

    // All required parameters should pass
    const v3 = featureMoveCommand.validateArgs({
      featureId: 'my-feature',
      targetDomain: 'new-domain',
    });
    expect(v3.valid).toBe(true);
  });

  it('should pass P0-2: Positional Arguments', () => {
    const metadata = featureMoveCommand.getMetadata();
    const params = metadata.input.parameters;

    const featureIdParam = params.find((p) => p.name === 'featureId');
    expect(featureIdParam).toBeDefined();
    expect(featureIdParam?.positional).toBe(true);
    expect(featureIdParam?.required).toBe(true);

    const targetDomainParam = params.find((p) => p.name === 'targetDomain');
    expect(targetDomainParam).toBeDefined();
    expect(targetDomainParam?.positional).toBe(true);
    expect(targetDomainParam?.required).toBe(true);
  });

  it('should pass P0-3: Lazy Loading', () => {
    expect(featureMoveCommand['handlerLoaded']).toBe(false);
    const metadata = featureMoveCommand.getMetadata();
    expect(metadata.name).toBe('planning feature move');
    expect(featureMoveCommand['handlerLoaded']).toBe(false);
  });

  it('should support MCP interface', () => {
    const mcpTool = featureMoveCommand.toMCP();
    expect(mcpTool.name).toMatch(/planning_feature_move$/);
    expect(mcpTool.description.toLowerCase()).toContain('move');
  });

  it('should generate CLI command correctly', () => {
    const cliCmd = featureMoveCommand.toCLI();
    expect(cliCmd.name()).toBe('move');
  });
});
