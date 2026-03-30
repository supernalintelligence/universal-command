import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { CommandRegistry, UniversalCommand } from '../index';
import {
  generate,
  generatorRegistry,
  GeneratorRegistry,
  NextRoutesGenerator,
  MCPServerGenerator,
  OpenAPIGenerator
} from './index';

describe('Generator Plugin System', () => {
  let tempDir: string;
  let registry: CommandRegistry;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gen-test-'));
    registry = new CommandRegistry();
    registry.register(new UniversalCommand({
      name: 'user list',
      description: 'List users',
      category: 'users',
      input: { parameters: [] },
      output: { type: 'json' },
      handler: async () => []
    }));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('GeneratorRegistry', () => {
    it('should have built-in generators registered', () => {
      expect(generatorRegistry.has('next-routes')).toBe(true);
      expect(generatorRegistry.has('mcp-server')).toBe(true);
      expect(generatorRegistry.has('openapi')).toBe(true);
    });

    it('should register custom generators', () => {
      const customRegistry = new GeneratorRegistry();
      const mockGenerator = {
        name: 'custom-gen',
        description: 'Custom generator',
        outputExtensions: ['.ts'],
        generate: async () => ({ files: [] })
      };

      customRegistry.register(mockGenerator);
      expect(customRegistry.has('custom-gen')).toBe(true);
      expect(customRegistry.get('custom-gen')).toBe(mockGenerator);
    });

    it('should throw on duplicate registration', () => {
      const customRegistry = new GeneratorRegistry();
      const mockGenerator = {
        name: 'custom-gen',
        description: 'Custom generator',
        outputExtensions: ['.ts'],
        generate: async () => ({ files: [] })
      };

      customRegistry.register(mockGenerator);
      expect(() => customRegistry.register(mockGenerator))
        .toThrow('Generator "custom-gen" is already registered');
    });

    it('should list all generators', () => {
      const generators = generatorRegistry.getAll();
      expect(generators.length).toBeGreaterThanOrEqual(3);
      expect(generators.map(g => g.name)).toContain('next-routes');
    });
  });

  describe('generate()', () => {
    it('should throw for unknown generator', async () => {
      await expect(generate('unknown', registry, {}))
        .rejects.toThrow('Generator "unknown" not found');
    });
  });

  describe('NextRoutesGenerator', () => {
    it('should create route files in correct directory structure', async () => {
      const result = await generate('next-routes', registry, { outputDir: tempDir });
      expect(result.files).toHaveLength(1);

      const routeFile = path.join(tempDir, 'user/list/route.ts');
      expect(await fs.pathExists(routeFile)).toBe(true);
    });

    it('should generate valid TypeScript content', async () => {
      await generate('next-routes', registry, { outputDir: tempDir });

      const content = await fs.readFile(
        path.join(tempDir, 'user/list/route.ts'),
        'utf-8'
      );

      expect(content).toContain('Auto-generated API route');
      expect(content).toContain('export const GET');
      expect(content).toContain('@supernal/universal-command');
    });

    it('should handle multiple commands', async () => {
      registry.register(new UniversalCommand({
        name: 'user create',
        description: 'Create user',
        input: { parameters: [] },
        output: { type: 'json' },
        handler: async () => ({}),
        api: { method: 'POST' }
      }));

      const result = await generate('next-routes', registry, { outputDir: tempDir });

      expect(result.files).toHaveLength(2);
      expect(await fs.pathExists(path.join(tempDir, 'user/list/route.ts'))).toBe(true);
      expect(await fs.pathExists(path.join(tempDir, 'user/create/route.ts'))).toBe(true);
    });

    it('should respect dryRun option', async () => {
      const result = await generate('next-routes', registry, {
        outputDir: tempDir,
        dryRun: true
      });

      expect(result.files[0].created).toBe(false);
      expect(result.files[0].content).toBeTruthy();
      expect(await fs.pathExists(path.join(tempDir, 'user/list/route.ts'))).toBe(false);
    });
  });

  describe('MCPServerGenerator', () => {
    it('should create MCP server file', async () => {
      const outputPath = path.join(tempDir, 'mcp-server.ts');
      const result = await generate('mcp-server', registry, { outputPath });

      expect(result.files).toHaveLength(1);
      expect(await fs.pathExists(outputPath)).toBe(true);
    });

    it('should include server configuration', async () => {
      const outputPath = path.join(tempDir, 'mcp-server.ts');
      await generate('mcp-server', registry, {
        outputPath,
        serverName: 'my-server',
        serverVersion: '2.0.0'
      });

      const content = await fs.readFile(outputPath, 'utf-8');
      expect(content).toContain('my-server');
      expect(content).toContain('2.0.0');
      expect(content).toContain('createMCPServer');
    });

    it('should respect dryRun option', async () => {
      const outputPath = path.join(tempDir, 'mcp-server.ts');
      const result = await generate('mcp-server', registry, {
        outputPath,
        dryRun: true
      });

      expect(result.files[0].created).toBe(false);
      expect(await fs.pathExists(outputPath)).toBe(false);
    });
  });

  describe('OpenAPIGenerator', () => {
    it('should create OpenAPI spec file', async () => {
      const outputPath = path.join(tempDir, 'openapi.yaml');
      const result = await generate('openapi', registry, { outputPath });

      expect(result.files).toHaveLength(1);
      expect(await fs.pathExists(outputPath)).toBe(true);
    });

    it('should generate YAML format by default', async () => {
      const outputPath = path.join(tempDir, 'openapi.yaml');
      await generate('openapi', registry, { outputPath });

      const content = await fs.readFile(outputPath, 'utf-8');
      expect(content).toContain('openapi:');
      expect(content).toContain('3.0.3');
      expect(content).toContain('/user/list');
    });

    it('should generate JSON format when specified', async () => {
      const outputPath = path.join(tempDir, 'openapi.json');
      await generate('openapi', registry, { outputPath, format: 'json' });

      const content = await fs.readFile(outputPath, 'utf-8');
      const spec = JSON.parse(content);

      expect(spec.openapi).toBe('3.0.3');
      expect(spec.paths['/user/list']).toBeDefined();
    });

    it('should include custom title and version', async () => {
      const outputPath = path.join(tempDir, 'openapi.yaml');
      await generate('openapi', registry, {
        outputPath,
        title: 'My Custom API',
        version: '2.0.0',
        description: 'A test API'
      });

      const content = await fs.readFile(outputPath, 'utf-8');
      expect(content).toContain('My Custom API');
      expect(content).toContain('2.0.0');
    });

    it('should include parameters for GET commands', async () => {
      registry.register(new UniversalCommand({
        name: 'user get',
        description: 'Get a user',
        input: {
          parameters: [
            { name: 'id', type: 'string', required: true, description: 'User ID' }
          ]
        },
        output: { type: 'json' },
        handler: async () => ({})
      }));

      const outputPath = path.join(tempDir, 'openapi.json');
      await generate('openapi', registry, { outputPath, format: 'json' });

      const spec = JSON.parse(await fs.readFile(outputPath, 'utf-8'));
      const userGetOp = spec.paths['/user/get'].get;

      expect(userGetOp.parameters).toBeDefined();
      expect(userGetOp.parameters[0].name).toBe('id');
      expect(userGetOp.parameters[0].in).toBe('query');
    });

    it('should include requestBody for POST commands', async () => {
      registry.register(new UniversalCommand({
        name: 'user create',
        description: 'Create a user',
        input: {
          parameters: [
            { name: 'name', type: 'string', required: true, description: 'User name' }
          ]
        },
        output: { type: 'json' },
        handler: async () => ({}),
        api: { method: 'POST' }
      }));

      const outputPath = path.join(tempDir, 'openapi.json');
      await generate('openapi', registry, { outputPath, format: 'json' });

      const spec = JSON.parse(await fs.readFile(outputPath, 'utf-8'));
      const userCreateOp = spec.paths['/user/create'].post;

      expect(userCreateOp.requestBody).toBeDefined();
      expect(userCreateOp.requestBody.content['application/json']).toBeDefined();
    });
  });
});
