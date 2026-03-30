import { describe, it, expect, beforeEach } from 'vitest';
import { CommandRegistry } from './CommandRegistry';
import { UniversalCommand } from './UniversalCommand';

describe('CommandRegistry', () => {
  let registry: CommandRegistry;
  let userListCmd: UniversalCommand;
  let userCreateCmd: UniversalCommand;
  let productListCmd: UniversalCommand;

  beforeEach(() => {
    registry = new CommandRegistry();

    userListCmd = new UniversalCommand({
      name: 'user list',
      description: 'List users',
      category: 'users',
      input: { parameters: [] },
      output: { type: 'json' },
      handler: async () => [],
    });

    userCreateCmd = new UniversalCommand({
      name: 'user create',
      description: 'Create user',
      category: 'users',
      input: {
        parameters: [
          { name: 'name', type: 'string', required: true, description: 'Name' },
        ],
      },
      output: { type: 'json' },
      handler: async () => ({}),
    });

    productListCmd = new UniversalCommand({
      name: 'product list',
      description: 'List products',
      category: 'products',
      input: { parameters: [] },
      output: { type: 'json' },
      handler: async () => [],
    });
  });

  describe('register', () => {
    it('should register a command', () => {
      registry.register(userListCmd);
      expect(registry.has('user list')).toBe(true);
    });

    it('should overwrite when registering duplicate command', () => {
      registry.register(userListCmd);

      const newUserListCmd = new UniversalCommand({
        name: 'user list',
        description: 'Updated list users',
        category: 'users',
        input: { parameters: [] },
        output: { type: 'json' },
        handler: async () => ['updated'],
      });

      registry.register(newUserListCmd);
      expect(registry.get('user list')?.schema.description).toBe('Updated list users');
    });
  });

  describe('get', () => {
    it('should get a registered command', () => {
      registry.register(userListCmd);
      const cmd = registry.get('user list');
      expect(cmd).toBe(userListCmd);
    });

    it('should return undefined for unregistered command', () => {
      const cmd = registry.get('nonexistent');
      expect(cmd).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return all registered commands', () => {
      registry.register(userListCmd);
      registry.register(userCreateCmd);

      const commands = registry.getAll();
      expect(commands).toHaveLength(2);
      expect(commands).toContain(userListCmd);
      expect(commands).toContain(userCreateCmd);
    });

    it('should return empty array when no commands registered', () => {
      expect(registry.getAll()).toEqual([]);
    });
  });

  describe('getByCategory', () => {
    it('should return commands filtered by category', () => {
      registry.register(userListCmd);
      registry.register(userCreateCmd);
      registry.register(productListCmd);

      const userCommands = registry.getByCategory('users');
      expect(userCommands).toHaveLength(2);
      expect(userCommands).toContain(userListCmd);
      expect(userCommands).toContain(userCreateCmd);

      const productCommands = registry.getByCategory('products');
      expect(productCommands).toHaveLength(1);
      expect(productCommands).toContain(productListCmd);
    });
  });

  describe('findByMCPName', () => {
    it('should find command by MCP tool name', () => {
      registry.register(userListCmd);
      const cmd = registry.findByMCPName('sc_user_list');
      expect(cmd).toBe(userListCmd);
    });

    it('should find command with custom MCP tool name', () => {
      const customCmd = new UniversalCommand({
        name: 'custom command',
        description: 'Custom',
        input: { parameters: [] },
        output: { type: 'json' },
        handler: async () => ({}),
        mcp: { toolName: 'my_custom_tool' },
      });

      registry.register(customCmd);
      const cmd = registry.findByMCPName('my_custom_tool');
      expect(cmd).toBe(customCmd);
    });

    it('should return undefined for unknown MCP tool name', () => {
      const cmd = registry.findByMCPName('unknown_tool');
      expect(cmd).toBeUndefined();
    });
  });

  describe('findByAPIPath', () => {
    it('should find command by API path', () => {
      registry.register(userListCmd);
      const cmd = registry.findByAPIPath('user/list');
      expect(cmd).toBe(userListCmd);
    });

    it('should return undefined for unknown API path', () => {
      const cmd = registry.findByAPIPath('unknown/path');
      expect(cmd).toBeUndefined();
    });
  });

  describe('has', () => {
    it('should return true for registered command', () => {
      registry.register(userListCmd);
      expect(registry.has('user list')).toBe(true);
    });

    it('should return false for unregistered command', () => {
      expect(registry.has('nonexistent')).toBe(false);
    });
  });

  describe('unregister', () => {
    it('should unregister a command', () => {
      registry.register(userListCmd);
      expect(registry.has('user list')).toBe(true);

      registry.unregister('user list');
      expect(registry.has('user list')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all commands', () => {
      registry.register(userListCmd);
      registry.register(userCreateCmd);
      expect(registry.getAll()).toHaveLength(2);

      registry.clear();
      expect(registry.getAll()).toHaveLength(0);
    });
  });
});
