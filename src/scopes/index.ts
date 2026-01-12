/**
 * Scope-Based Tool Architecture
 *
 * Scopes are semantic namespaces that enable:
 * - O(1) keyed lookup instead of O(n) filtering
 * - Progressive loading (load scope → get its tools)
 * - Semantic discovery (keywords + optional embeddings)
 * - Clear visibility control (load/unload to activate/deactivate)
 *
 * @example
 * ```typescript
 * const registry = new ScopeRegistry();
 *
 * // Register a scope
 * registry.registerScope({
 *   id: 'requirement',
 *   name: 'Requirement Management',
 *   description: 'Tools for managing project requirements',
 *   keywords: ['requirement', 'req', 'spec']
 * });
 *
 * // Register command in scope
 * const cmd = new UniversalCommand({
 *   name: 'requirement list',
 *   scope: 'requirement',  // <-- scope assignment
 *   ...
 * });
 * registry.register(cmd);
 *
 * // Load scope for AI access
 * registry.loadScope('requirement');
 *
 * // Get only loaded commands (for MCP tools/list)
 * const tools = registry.getLoadedCommands();
 *
 * // O(1) lookup
 * const tool = registry.getCommand('requirement', 'requirement list');
 * ```
 */

export { ScopeRegistry, createScopeRegistry } from './ScopeRegistry';

// Re-export Scope type from types
export type { Scope, ScopeOptions } from '../types';
