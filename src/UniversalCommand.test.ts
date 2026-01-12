import { describe, it, expect } from 'vitest';
import { UniversalCommand } from './UniversalCommand';
import { ValidationError } from './errors';

describe('UniversalCommand', () => {
  describe('constructor', () => {
    it('should create a command with valid schema', () => {
      const cmd = new UniversalCommand({
        name: 'test',
        description: 'Test command',
        input: { parameters: [] },
        output: { type: 'json' },
        handler: async () => ({ success: true }),
      });

      expect(cmd.schema.name).toBe('test');
      expect(cmd.schema.description).toBe('Test command');
    });

    it('should throw error when name is missing', () => {
      expect(() => {
        new UniversalCommand({
          name: '',
          description: 'Test',
          input: { parameters: [] },
          output: { type: 'json' },
          handler: async () => ({}),
        });
      }).toThrow('Command name is required');
    });

    it('should throw error when description is missing', () => {
      expect(() => {
        new UniversalCommand({
          name: 'test',
          description: '',
          input: { parameters: [] },
          output: { type: 'json' },
          handler: async () => ({}),
        });
      }).toThrow('Command description is required');
    });

    it('should throw error when handler is missing', () => {
      expect(() => {
        new UniversalCommand({
          name: 'test',
          description: 'Test',
          input: { parameters: [] },
          output: { type: 'json' },
          handler: undefined as any,
        });
      }).toThrow('Command handler is required');
    });
  });

  describe('execute', () => {
    it('should execute handler with valid arguments', async () => {
      const cmd = new UniversalCommand({
        name: 'greet',
        description: 'Greet user',
        input: {
          parameters: [
            { name: 'name', type: 'string', required: true, description: 'Name to greet' },
          ],
        },
        output: { type: 'text' },
        handler: async (args) => `Hello, ${args.name}!`,
      });

      const result = await cmd.execute({ name: 'World' }, { interface: 'cli' });
      expect(result).toBe('Hello, World!');
    });

    it('should throw ValidationError for missing required parameters', async () => {
      const cmd = new UniversalCommand({
        name: 'greet',
        description: 'Greet user',
        input: {
          parameters: [
            { name: 'name', type: 'string', required: true, description: 'Name' },
          ],
        },
        output: { type: 'text' },
        handler: async (args) => `Hello, ${args.name}!`,
      });

      await expect(cmd.execute({}, { interface: 'cli' })).rejects.toThrow(ValidationError);
    });

    it('should use default values for optional parameters', async () => {
      const cmd = new UniversalCommand({
        name: 'greet',
        description: 'Greet user',
        input: {
          parameters: [
            { name: 'name', type: 'string', default: 'World', description: 'Name' },
          ],
        },
        output: { type: 'text' },
        handler: async (args) => `Hello, ${args.name}!`,
      });

      const result = await cmd.execute({}, { interface: 'cli' });
      expect(result).toBe('Hello, World!');
    });
  });

  describe('validateArgs', () => {
    it('should validate string type', () => {
      const cmd = new UniversalCommand({
        name: 'test',
        description: 'Test',
        input: {
          parameters: [{ name: 'value', type: 'string', description: 'Value' }],
        },
        output: { type: 'json' },
        handler: async () => ({}),
      });

      expect(cmd.validateArgs({ value: 'hello' }).valid).toBe(true);
      expect(cmd.validateArgs({ value: 123 }).valid).toBe(false);
    });

    it('should validate number type', () => {
      const cmd = new UniversalCommand({
        name: 'test',
        description: 'Test',
        input: {
          parameters: [{ name: 'value', type: 'number', description: 'Value' }],
        },
        output: { type: 'json' },
        handler: async () => ({}),
      });

      expect(cmd.validateArgs({ value: 42 }).valid).toBe(true);
      expect(cmd.validateArgs({ value: 'not-a-number' }).valid).toBe(false);
    });

    it('should validate boolean type', () => {
      const cmd = new UniversalCommand({
        name: 'test',
        description: 'Test',
        input: {
          parameters: [{ name: 'value', type: 'boolean', description: 'Value' }],
        },
        output: { type: 'json' },
        handler: async () => ({}),
      });

      expect(cmd.validateArgs({ value: true }).valid).toBe(true);
      expect(cmd.validateArgs({ value: false }).valid).toBe(true);
      expect(cmd.validateArgs({ value: 'true' }).valid).toBe(false);
    });

    it('should validate array type', () => {
      const cmd = new UniversalCommand({
        name: 'test',
        description: 'Test',
        input: {
          parameters: [{ name: 'value', type: 'array', description: 'Value' }],
        },
        output: { type: 'json' },
        handler: async () => ({}),
      });

      expect(cmd.validateArgs({ value: [1, 2, 3] }).valid).toBe(true);
      expect(cmd.validateArgs({ value: 'not-array' }).valid).toBe(false);
    });

    it('should validate object type', () => {
      const cmd = new UniversalCommand({
        name: 'test',
        description: 'Test',
        input: {
          parameters: [{ name: 'value', type: 'object', description: 'Value' }],
        },
        output: { type: 'json' },
        handler: async () => ({}),
      });

      expect(cmd.validateArgs({ value: { key: 'value' } }).valid).toBe(true);
      expect(cmd.validateArgs({ value: [1, 2] }).valid).toBe(false);
      expect(cmd.validateArgs({ value: null }).valid).toBe(false);
    });

    it('should validate enum values', () => {
      const cmd = new UniversalCommand({
        name: 'test',
        description: 'Test',
        input: {
          parameters: [
            { name: 'role', type: 'string', enum: ['admin', 'user'], description: 'Role' },
          ],
        },
        output: { type: 'json' },
        handler: async () => ({}),
      });

      expect(cmd.validateArgs({ role: 'admin' }).valid).toBe(true);
      expect(cmd.validateArgs({ role: 'invalid' }).valid).toBe(false);
    });

    it('should validate number min/max', () => {
      const cmd = new UniversalCommand({
        name: 'test',
        description: 'Test',
        input: {
          parameters: [
            { name: 'count', type: 'number', min: 1, max: 100, description: 'Count' },
          ],
        },
        output: { type: 'json' },
        handler: async () => ({}),
      });

      expect(cmd.validateArgs({ count: 50 }).valid).toBe(true);
      expect(cmd.validateArgs({ count: 0 }).valid).toBe(false);
      expect(cmd.validateArgs({ count: 101 }).valid).toBe(false);
    });

    it('should validate string pattern', () => {
      const cmd = new UniversalCommand({
        name: 'test',
        description: 'Test',
        input: {
          parameters: [
            { name: 'email', type: 'string', pattern: '^[^@]+@[^@]+\\.[^@]+$', description: 'Email' },
          ],
        },
        output: { type: 'json' },
        handler: async () => ({}),
      });

      expect(cmd.validateArgs({ email: 'test@example.com' }).valid).toBe(true);
      expect(cmd.validateArgs({ email: 'not-an-email' }).valid).toBe(false);
    });
  });

  describe('getAPIRoutePath', () => {
    it('should convert command name to API path', () => {
      const cmd = new UniversalCommand({
        name: 'user list',
        description: 'List users',
        input: { parameters: [] },
        output: { type: 'json' },
        handler: async () => [],
      });

      expect(cmd.getAPIRoutePath()).toBe('user/list');
    });
  });

  describe('getMCPToolName', () => {
    it('should generate default MCP tool name', () => {
      const cmd = new UniversalCommand({
        name: 'user list',
        description: 'List users',
        input: { parameters: [] },
        output: { type: 'json' },
        handler: async () => [],
      });

      expect(cmd.getMCPToolName()).toBe('sc_user_list');
    });

    it('should use custom MCP tool name if provided', () => {
      const cmd = new UniversalCommand({
        name: 'user list',
        description: 'List users',
        input: { parameters: [] },
        output: { type: 'json' },
        handler: async () => [],
        mcp: { toolName: 'custom_list_users' },
      });

      expect(cmd.getMCPToolName()).toBe('custom_list_users');
    });
  });

  describe('toMCP', () => {
    it('should generate valid MCP tool definition', () => {
      const cmd = new UniversalCommand({
        name: 'user list',
        description: 'List all users',
        input: {
          parameters: [
            { name: 'role', type: 'string', enum: ['admin', 'user'], description: 'Filter by role' },
            { name: 'limit', type: 'number', default: 10, min: 1, max: 100, description: 'Max results' },
          ],
        },
        output: { type: 'json' },
        handler: async () => [],
      });

      const mcpTool = cmd.toMCP();

      expect(mcpTool.name).toBe('sc_user_list');
      expect(mcpTool.description).toBe('List all users');
      expect(mcpTool.inputSchema.type).toBe('object');
      expect(mcpTool.inputSchema.properties.role.enum).toEqual(['admin', 'user']);
      expect(mcpTool.inputSchema.properties.limit.minimum).toBe(1);
      expect(mcpTool.inputSchema.properties.limit.maximum).toBe(100);
      expect(typeof mcpTool.execute).toBe('function');
    });

    it('should execute MCP tool and return result', async () => {
      const cmd = new UniversalCommand({
        name: 'echo',
        description: 'Echo message',
        input: {
          parameters: [
            { name: 'message', type: 'string', required: true, description: 'Message' },
          ],
        },
        output: { type: 'text' },
        handler: async (args) => ({ echoed: args.message }),
      });

      const mcpTool = cmd.toMCP();
      const result = await mcpTool.execute({ message: 'hello' });

      expect(result.content[0].type).toBe('text');
      expect(JSON.parse(result.content[0].text)).toEqual({ echoed: 'hello' });
    });
  });
});
