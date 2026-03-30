/**
 * Scope-Based Registry for Universal Commands
 *
 * Provides O(1) keyed lookup instead of O(n) filtering.
 * Scopes are semantic namespaces that group related tools.
 *
 * Architecture:
 *   Scope (semantic namespace)
 *   └── Commands (O(1) lookup via Map)
 *
 * Scopes control tool visibility - load/unload scopes to
 * activate/deactivate groups of tools for AI agents.
 */

import { UniversalCommand } from '../UniversalCommand';
import type { Scope } from '../types';

/**
 * Default global scope for commands without explicit scope
 */
const GLOBAL_SCOPE: Scope = {
  id: 'global',
  name: 'Global',
  description: 'Always available commands',
  keywords: ['help', 'version', 'search', 'general'],
  autoLoad: true
};

/**
 * Scope Registry with O(1) keyed lookups
 *
 * Instead of getAll().filter(), uses:
 * - Map<scopeId, Scope> for scope metadata
 * - Map<scopeId, Map<commandName, Command>> for O(1) command lookup
 * - Set<scopeId> for loaded scopes state
 */
export class ScopeRegistry {
  /** Scope metadata by ID */
  private scopes = new Map<string, Scope>();

  /** Commands organized by scope → command name */
  private commandsByScope = new Map<string, Map<string, UniversalCommand>>();

  /** Currently loaded scopes */
  private loadedScopes = new Set<string>();

  /** MCP name → [scopeId, commandName] for O(1) MCP lookup */
  private mcpIndex = new Map<string, [string, string]>();

  /** API path → [scopeId, commandName] for O(1) API lookup */
  private apiIndex = new Map<string, [string, string]>();

  constructor() {
    // Always register global scope
    this.registerScope(GLOBAL_SCOPE);
    this.loadScope('global');
  }

  // ============================================================================
  // Scope Management
  // ============================================================================

  /**
   * Register a scope definition
   */
  registerScope(scope: Scope): void {
    this.scopes.set(scope.id, scope);
    if (!this.commandsByScope.has(scope.id)) {
      this.commandsByScope.set(scope.id, new Map());
    }
    if (scope.autoLoad) {
      this.loadScope(scope.id);
    }
  }

  /**
   * Get scope metadata by ID - O(1)
   */
  getScope(scopeId: string): Scope | undefined {
    return this.scopes.get(scopeId);
  }

  /**
   * Get all registered scopes
   */
  getAllScopes(): Scope[] {
    return Array.from(this.scopes.values());
  }

  /**
   * Check if a scope exists
   */
  hasScope(scopeId: string): boolean {
    return this.scopes.has(scopeId);
  }

  // ============================================================================
  // Scope Loading (Context Switching)
  // ============================================================================

  /**
   * Load a scope into active set
   * Only loaded scopes' tools are exposed to AI
   */
  loadScope(scopeId: string, options?: { includeChildren?: boolean }): void {
    const scope = this.scopes.get(scopeId);
    if (!scope) {
      throw new Error(`Scope "${scopeId}" not found`);
    }

    this.loadedScopes.add(scopeId);

    // Optionally load children
    if (options?.includeChildren && scope.children) {
      for (const childId of scope.children) {
        if (this.scopes.has(childId)) {
          this.loadedScopes.add(childId);
        }
      }
    }

    // Auto-load children marked with loadWithParent
    for (const [id, childScope] of this.scopes) {
      if (childScope.parent === scopeId && childScope.loadWithParent) {
        this.loadedScopes.add(id);
      }
    }
  }

  /**
   * Unload a scope (except global)
   */
  unloadScope(scopeId: string): void {
    if (scopeId === 'global') {
      return; // Global cannot be unloaded
    }
    this.loadedScopes.delete(scopeId);
  }

  /**
   * Check if a scope is loaded
   */
  isLoaded(scopeId: string): boolean {
    return this.loadedScopes.has(scopeId);
  }

  /**
   * Get all loaded scope IDs
   */
  getLoadedScopeIds(): string[] {
    return Array.from(this.loadedScopes);
  }

  /**
   * Unload all scopes except global
   */
  resetToGlobal(): void {
    this.loadedScopes.clear();
    this.loadedScopes.add('global');
  }

  // ============================================================================
  // Command Registration
  // ============================================================================

  /**
   * Register a command into its scope
   */
  register(command: UniversalCommand): void {
    const scopeId = command.schema.scope || 'global';

    // Ensure scope exists (auto-create if needed)
    if (!this.scopes.has(scopeId)) {
      this.registerScope({
        id: scopeId,
        name: scopeId.charAt(0).toUpperCase() + scopeId.slice(1),
        description: `Commands for ${scopeId}`,
        keywords: [scopeId]
      });
    }

    // Get or create scope's command map
    let scopeCommands = this.commandsByScope.get(scopeId);
    if (!scopeCommands) {
      scopeCommands = new Map();
      this.commandsByScope.set(scopeId, scopeCommands);
    }

    // Register command in scope
    const commandName = command.schema.name;
    scopeCommands.set(commandName, command);

    // Build indexes for O(1) lookup
    this.mcpIndex.set(command.getMCPToolName(), [scopeId, commandName]);
    this.apiIndex.set(command.getAPIRoutePath(), [scopeId, commandName]);
  }

  // ============================================================================
  // Command Lookup - O(1) Operations
  // ============================================================================

  /**
   * Get command by scope and name - O(1)
   */
  getCommand(scopeId: string, commandName: string): UniversalCommand | undefined {
    return this.commandsByScope.get(scopeId)?.get(commandName);
  }

  /**
   * Get command by name (searches all scopes) - O(scopes)
   * Use getCommand(scopeId, name) when scope is known for O(1)
   */
  get(name: string): UniversalCommand | undefined {
    for (const scopeCommands of this.commandsByScope.values()) {
      const cmd = scopeCommands.get(name);
      if (cmd) return cmd;
    }
    return undefined;
  }

  /**
   * Find command by MCP tool name - O(1)
   */
  findByMCPName(mcpName: string): UniversalCommand | undefined {
    const location = this.mcpIndex.get(mcpName);
    if (!location) return undefined;
    const [scopeId, commandName] = location;
    return this.commandsByScope.get(scopeId)?.get(commandName);
  }

  /**
   * Find command by API path - O(1)
   */
  findByAPIPath(apiPath: string): UniversalCommand | undefined {
    const location = this.apiIndex.get(apiPath);
    if (!location) return undefined;
    const [scopeId, commandName] = location;
    return this.commandsByScope.get(scopeId)?.get(commandName);
  }

  // ============================================================================
  // Scope-Based Queries
  // ============================================================================

  /**
   * Get all commands in a specific scope - O(1) to get scope, O(n) for scope's commands
   */
  getCommandsInScope(scopeId: string): UniversalCommand[] {
    const scopeCommands = this.commandsByScope.get(scopeId);
    if (!scopeCommands) return [];
    return Array.from(scopeCommands.values());
  }

  /**
   * Get all commands from loaded scopes only
   * This is what MCP tools/list should return
   */
  getLoadedCommands(): UniversalCommand[] {
    const commands: UniversalCommand[] = [];
    for (const scopeId of this.loadedScopes) {
      const scopeCommands = this.commandsByScope.get(scopeId);
      if (scopeCommands) {
        commands.push(...scopeCommands.values());
      }
    }
    return commands;
  }

  /**
   * Get all commands (regardless of loaded state)
   * Use sparingly - prefer getLoadedCommands() for MCP
   */
  getAll(): UniversalCommand[] {
    const commands: UniversalCommand[] = [];
    for (const scopeCommands of this.commandsByScope.values()) {
      commands.push(...scopeCommands.values());
    }
    return commands;
  }

  // ============================================================================
  // Semantic Scope Discovery
  // ============================================================================

  /**
   * Find scopes by keyword matching - Fast path
   */
  findScopesByKeyword(query: string): Scope[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.scopes.values()).filter(scope =>
      scope.keywords.some(k => lowerQuery.includes(k.toLowerCase())) ||
      scope.name.toLowerCase().includes(lowerQuery) ||
      scope.id.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get scopes available in current state
   */
  getAvailableScopes(currentStates: string[]): Scope[] {
    return Array.from(this.scopes.values()).filter(scope => {
      if (!scope.requiredStates || scope.requiredStates.length === 0) {
        return true;
      }
      return scope.requiredStates.every(s => currentStates.includes(s));
    });
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Check if command exists
   */
  has(name: string): boolean {
    return this.get(name) !== undefined;
  }

  /**
   * Remove a command
   */
  unregister(name: string): boolean {
    for (const [, scopeCommands] of this.commandsByScope) {
      if (scopeCommands.has(name)) {
        const cmd = scopeCommands.get(name)!;
        // Remove from indexes
        this.mcpIndex.delete(cmd.getMCPToolName());
        this.apiIndex.delete(cmd.getAPIRoutePath());
        return scopeCommands.delete(name);
      }
    }
    return false;
  }

  /**
   * Clear all commands and scopes (except global)
   */
  clear(): void {
    this.scopes.clear();
    this.commandsByScope.clear();
    this.loadedScopes.clear();
    this.mcpIndex.clear();
    this.apiIndex.clear();

    // Re-register global
    this.registerScope(GLOBAL_SCOPE);
    this.loadScope('global');
  }

  /**
   * Get total command count
   */
  get size(): number {
    let count = 0;
    for (const scopeCommands of this.commandsByScope.values()) {
      count += scopeCommands.size;
    }
    return count;
  }

  /**
   * Get scope count
   */
  get scopeCount(): number {
    return this.scopes.size;
  }
}

/**
 * Create a default global scope registry
 */
export function createScopeRegistry(): ScopeRegistry {
  return new ScopeRegistry();
}
