export * from './UniversalCommand';
export * from './CommandRegistry';
export * from './types';
export * from './errors';

// Runtime registration (no code generation needed)
export { RuntimeServer, createRuntimeServer, defineCommands } from './runtime';
export type { RuntimeAPIConfig, RuntimeMCPConfig } from './runtime';

// Scope-based registry (O(1) keyed lookup, semantic namespaces)
export { ScopeRegistry, createScopeRegistry } from './scopes';
export type { Scope, ScopeOptions } from './scopes';
