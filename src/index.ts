export * from './UniversalCommand';
export * from './CommandRegistry';
export * from './types';
export * from './errors';

// P0-3: Lazy loading for fast startup
export { LazyUniversalCommand, lazyCommand, LazyCommandPerformance } from './LazyUniversalCommand';
export type { LazyCommandSchema } from './LazyUniversalCommand';

// P1-8: Global options and hooks
export { CLIProgram, createCLIProgram } from './CLIProgram';
export type { GlobalOption, CLIHooks, CLIProgramOptions } from './CLIProgram';

// P1-9: Fast help generation
export {
  HelpGenerator,
  createHelpGenerator,
  generateHelp,
  generateMarkdownHelp,
} from './HelpGenerator';
export type { HelpOptions } from './HelpGenerator';

// P1-10: Output formatting helpers
export * from './formatting';

// Runtime registration (no code generation needed)
export { RuntimeServer, createRuntimeServer, defineCommands } from './runtime';
export type { RuntimeAPIConfig, RuntimeMCPConfig } from './runtime';

// Scope-based registry (O(1) keyed lookup, semantic namespaces)
export { ScopeRegistry, createScopeRegistry } from './scopes';
export type { Scope, ScopeOptions } from './scopes';

// Modal agent commands
export { modalSpawnCommand, modalProvisionCommand, modalStatusCommand } from './commands/modal';

// System commands (operations/infrastructure)
export { systemServicesCommand } from './commands/system';
