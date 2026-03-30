/**
 * Tests for ScopeRegistry - O(1) keyed lookup implementation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ScopeRegistry, createScopeRegistry } from './ScopeRegistry';
import { UniversalCommand } from '../UniversalCommand';
import type { Scope } from '../types';

describe('ScopeRegistry', () => {
  let registry: ScopeRegistry;

  beforeEach(() => {
    registry = new ScopeRegistry();
  });

  describe('initialization', () => {
    it('should have global scope registered by default', () => {
      expect(registry.hasScope('global')).toBe(true);
      expect(registry.isLoaded('global')).toBe(true);
    });

    it('should create via factory function', () => {
      const reg = createScopeRegistry();
      expect(reg).toBeInstanceOf(ScopeRegistry);
      expect(reg.hasScope('global')).toBe(true);
    });
  });

  describe('scope management', () => {
    it('should register a scope', () => {
      const scope: Scope = {
        id: 'requirement',
        name: 'Requirements',
        description: 'Requirement management tools',
        keywords: ['requirement', 'req', 'spec']
      };

      registry.registerScope(scope);
      expect(registry.hasScope('requirement')).toBe(true);
      expect(registry.getScope('requirement')).toEqual(scope);
    });

    it('should auto-load scope with autoLoad flag', () => {
      registry.registerScope({
        id: 'always-on',
        name: 'Always On',
        description: 'Always loaded',
        keywords: [],
        autoLoad: true
      });

      expect(registry.isLoaded('always-on')).toBe(true);
    });

    it('should get all scopes', () => {
      registry.registerScope({
        id: 'test',
        name: 'Test',
        description: 'Test scope',
        keywords: ['test']
      });

      const scopes = registry.getAllScopes();
      expect(scopes.length).toBe(2); // global + test
      expect(scopes.map(s => s.id)).toContain('global');
      expect(scopes.map(s => s.id)).toContain('test');
    });
  });

  describe('scope loading', () => {
    beforeEach(() => {
      registry.registerScope({
        id: 'git',
        name: 'Git',
        description: 'Git operations',
        keywords: ['git', 'version control']
      });
    });

    it('should load a scope', () => {
      expect(registry.isLoaded('git')).toBe(false);
      registry.loadScope('git');
      expect(registry.isLoaded('git')).toBe(true);
    });

    it('should throw when loading non-existent scope', () => {
      expect(() => registry.loadScope('nonexistent')).toThrow('Scope "nonexistent" not found');
    });

    it('should unload a scope', () => {
      registry.loadScope('git');
      expect(registry.isLoaded('git')).toBe(true);
      registry.unloadScope('git');
      expect(registry.isLoaded('git')).toBe(false);
    });

    it('should not unload global scope', () => {
      registry.unloadScope('global');
      expect(registry.isLoaded('global')).toBe(true);
    });

    it('should reset to global only', () => {
      registry.loadScope('git');
      registry.resetToGlobal();
      expect(registry.isLoaded('global')).toBe(true);
      expect(registry.isLoaded('git')).toBe(false);
    });

    it('should get loaded scope IDs', () => {
      registry.loadScope('git');
      const loaded = registry.getLoadedScopeIds();
      expect(loaded).toContain('global');
      expect(loaded).toContain('git');
    });
  });

  describe('child scope loading', () => {
    beforeEach(() => {
      registry.registerScope({
        id: 'git',
        name: 'Git',
        description: 'Git operations',
        keywords: ['git'],
        children: ['git.branch']
      });

      registry.registerScope({
        id: 'git.branch',
        name: 'Git Branch',
        description: 'Branch operations',
        keywords: ['branch'],
        parent: 'git',
        loadWithParent: true
      });
    });

    it('should auto-load children with loadWithParent flag', () => {
      registry.loadScope('git');
      expect(registry.isLoaded('git.branch')).toBe(true);
    });

    it('should load children with includeChildren option', () => {
      registry.registerScope({
        id: 'git.remote',
        name: 'Git Remote',
        description: 'Remote operations',
        keywords: ['remote'],
        parent: 'git'
        // No loadWithParent flag
      });

      // Update parent's children
      registry.registerScope({
        id: 'git',
        name: 'Git',
        description: 'Git operations',
        keywords: ['git'],
        children: ['git.branch', 'git.remote']
      });

      registry.loadScope('git', { includeChildren: true });
      expect(registry.isLoaded('git.branch')).toBe(true);
      expect(registry.isLoaded('git.remote')).toBe(true);
    });
  });

  describe('command registration', () => {
    it('should register command in specified scope', () => {
      const cmd = new UniversalCommand({
        name: 'requirement list',
        description: 'List requirements',
        scope: 'requirement',
        input: { parameters: [] },
        output: { type: 'json' },
        handler: async () => []
      });

      registry.register(cmd);
      expect(registry.hasScope('requirement')).toBe(true);
      expect(registry.getCommand('requirement', 'requirement list')).toBe(cmd);
    });

    it('should register command in global scope by default', () => {
      const cmd = new UniversalCommand({
        name: 'help',
        description: 'Show help',
        input: { parameters: [] },
        output: { type: 'text' },
        handler: async () => 'help text'
      });

      registry.register(cmd);
      expect(registry.getCommand('global', 'help')).toBe(cmd);
    });
  });

  describe('O(1) lookups', () => {
    let reqList: UniversalCommand;
    let reqCreate: UniversalCommand;
    let gitStatus: UniversalCommand;

    beforeEach(() => {
      registry.registerScope({
        id: 'requirement',
        name: 'Requirements',
        description: 'Requirement tools',
        keywords: ['requirement']
      });

      registry.registerScope({
        id: 'git',
        name: 'Git',
        description: 'Git tools',
        keywords: ['git']
      });

      reqList = new UniversalCommand({
        name: 'requirement list',
        description: 'List requirements',
        scope: 'requirement',
        input: { parameters: [] },
        output: { type: 'json' },
        handler: async () => []
      });

      reqCreate = new UniversalCommand({
        name: 'requirement create',
        description: 'Create requirement',
        scope: 'requirement',
        input: { parameters: [{ name: 'title', type: 'string', description: 'Title', required: true }] },
        output: { type: 'json' },
        handler: async () => ({})
      });

      gitStatus = new UniversalCommand({
        name: 'git status',
        description: 'Git status',
        scope: 'git',
        input: { parameters: [] },
        output: { type: 'text' },
        handler: async () => 'status'
      });

      registry.register(reqList);
      registry.register(reqCreate);
      registry.register(gitStatus);
    });

    it('should lookup command by scope and name - O(1)', () => {
      expect(registry.getCommand('requirement', 'requirement list')).toBe(reqList);
      expect(registry.getCommand('requirement', 'requirement create')).toBe(reqCreate);
      expect(registry.getCommand('git', 'git status')).toBe(gitStatus);
    });

    it('should lookup by MCP name - O(1)', () => {
      // MCP names have sc_ prefix by default
      expect(registry.findByMCPName('sc_requirement_list')).toBe(reqList);
      expect(registry.findByMCPName('sc_git_status')).toBe(gitStatus);
    });

    it('should lookup by API path - O(1)', () => {
      expect(registry.findByAPIPath('requirement/list')).toBe(reqList);
      expect(registry.findByAPIPath('git/status')).toBe(gitStatus);
    });

    it('should return undefined for non-existent command', () => {
      expect(registry.getCommand('requirement', 'nonexistent')).toBeUndefined();
      expect(registry.findByMCPName('nonexistent')).toBeUndefined();
      expect(registry.findByAPIPath('nonexistent')).toBeUndefined();
    });
  });

  describe('scope-based queries', () => {
    beforeEach(() => {
      registry.registerScope({
        id: 'requirement',
        name: 'Requirements',
        description: 'Requirement tools',
        keywords: ['requirement']
      });

      registry.register(new UniversalCommand({
        name: 'help',
        description: 'Show help',
        input: { parameters: [] },
        output: { type: 'text' },
        handler: async () => 'help'
      }));

      registry.register(new UniversalCommand({
        name: 'requirement list',
        description: 'List requirements',
        scope: 'requirement',
        input: { parameters: [] },
        output: { type: 'json' },
        handler: async () => []
      }));

      registry.register(new UniversalCommand({
        name: 'requirement create',
        description: 'Create requirement',
        scope: 'requirement',
        input: { parameters: [] },
        output: { type: 'json' },
        handler: async () => ({})
      }));
    });

    it('should get commands in a specific scope', () => {
      const reqCommands = registry.getCommandsInScope('requirement');
      expect(reqCommands.length).toBe(2);
      expect(reqCommands.map(c => c.schema.name)).toContain('requirement list');
      expect(reqCommands.map(c => c.schema.name)).toContain('requirement create');
    });

    it('should get only loaded commands', () => {
      // Only global is loaded
      let loaded = registry.getLoadedCommands();
      expect(loaded.length).toBe(1);
      expect(loaded[0].schema.name).toBe('help');

      // Load requirement scope
      registry.loadScope('requirement');
      loaded = registry.getLoadedCommands();
      expect(loaded.length).toBe(3);
    });

    it('should get all commands regardless of load state', () => {
      const all = registry.getAll();
      expect(all.length).toBe(3);
    });
  });

  describe('semantic scope discovery', () => {
    beforeEach(() => {
      registry.registerScope({
        id: 'requirement',
        name: 'Requirement Management',
        description: 'Tools for managing requirements',
        keywords: ['requirement', 'req', 'spec', 'feature']
      });

      registry.registerScope({
        id: 'git',
        name: 'Git Operations',
        description: 'Version control tools',
        keywords: ['git', 'version', 'commit', 'branch']
      });
    });

    it('should find scopes by keyword', () => {
      const scopes = registry.findScopesByKeyword('I want to work with requirements');
      expect(scopes.map(s => s.id)).toContain('requirement');
    });

    it('should find scopes by name', () => {
      const scopes = registry.findScopesByKeyword('git');
      expect(scopes.map(s => s.id)).toContain('git');
    });

    it('should find scopes by ID', () => {
      const scopes = registry.findScopesByKeyword('requirement');
      expect(scopes.map(s => s.id)).toContain('requirement');
    });
  });

  describe('state-based scope availability', () => {
    beforeEach(() => {
      registry.registerScope({
        id: 'deploy',
        name: 'Deployment',
        description: 'Deployment tools',
        keywords: ['deploy'],
        requiredStates: ['ci-configured', 'authenticated']
      });

      registry.registerScope({
        id: 'basic',
        name: 'Basic',
        description: 'Basic tools',
        keywords: ['basic']
        // No required states
      });
    });

    it('should filter scopes by current state', () => {
      // No states - deploy not available
      let available = registry.getAvailableScopes([]);
      expect(available.map(s => s.id)).not.toContain('deploy');
      expect(available.map(s => s.id)).toContain('basic');

      // Partial states - still not available
      available = registry.getAvailableScopes(['ci-configured']);
      expect(available.map(s => s.id)).not.toContain('deploy');

      // All states - deploy available
      available = registry.getAvailableScopes(['ci-configured', 'authenticated']);
      expect(available.map(s => s.id)).toContain('deploy');
    });
  });

  describe('utility methods', () => {
    it('should check if command exists', () => {
      registry.register(new UniversalCommand({
        name: 'test',
        description: 'Test',
        input: { parameters: [] },
        output: { type: 'text' },
        handler: async () => 'test'
      }));

      expect(registry.has('test')).toBe(true);
      expect(registry.has('nonexistent')).toBe(false);
    });

    it('should unregister command', () => {
      registry.register(new UniversalCommand({
        name: 'test',
        description: 'Test',
        input: { parameters: [] },
        output: { type: 'text' },
        handler: async () => 'test'
      }));

      expect(registry.unregister('test')).toBe(true);
      expect(registry.has('test')).toBe(false);
      expect(registry.unregister('nonexistent')).toBe(false);
    });

    it('should clear all except global', () => {
      registry.registerScope({
        id: 'test',
        name: 'Test',
        description: 'Test',
        keywords: []
      });

      registry.register(new UniversalCommand({
        name: 'test',
        description: 'Test',
        scope: 'test',
        input: { parameters: [] },
        output: { type: 'text' },
        handler: async () => 'test'
      }));

      registry.loadScope('test');
      expect(registry.size).toBe(1);
      expect(registry.scopeCount).toBe(2);

      registry.clear();
      expect(registry.size).toBe(0);
      expect(registry.scopeCount).toBe(1);
      expect(registry.hasScope('global')).toBe(true);
      expect(registry.isLoaded('global')).toBe(true);
    });

    it('should report size and scope count', () => {
      registry.register(new UniversalCommand({
        name: 'cmd1',
        description: 'Cmd 1',
        input: { parameters: [] },
        output: { type: 'text' },
        handler: async () => ''
      }));

      registry.register(new UniversalCommand({
        name: 'cmd2',
        description: 'Cmd 2',
        scope: 'other',
        input: { parameters: [] },
        output: { type: 'text' },
        handler: async () => ''
      }));

      expect(registry.size).toBe(2);
      expect(registry.scopeCount).toBe(2); // global + other
    });
  });
});
