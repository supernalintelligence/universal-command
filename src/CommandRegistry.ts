/**
 * CommandRegistry for managing multiple UniversalCommands
 */

import { UniversalCommand } from './UniversalCommand';

export class CommandRegistry {
  private commands: Map<string, UniversalCommand> = new Map();

  /**
   * Register a command
   */
  register(command: UniversalCommand): void {
    this.commands.set(command.schema.name, command);
  }

  /**
   * Get a command by name
   */
  get(name: string): UniversalCommand | undefined {
    return this.commands.get(name);
  }

  /**
   * Get all registered commands
   */
  getAll(): UniversalCommand[] {
    return Array.from(this.commands.values());
  }

  /**
   * Get commands by category
   */
  getByCategory(category: string): UniversalCommand[] {
    return this.getAll().filter(cmd => cmd.schema.category === category);
  }

  /**
   * Find command by MCP tool name
   */
  findByMCPName(mcpName: string): UniversalCommand | undefined {
    return this.getAll().find(cmd => cmd.getMCPToolName() === mcpName);
  }

  /**
   * Find command by API route path
   */
  findByAPIPath(path: string): UniversalCommand | undefined {
    return this.getAll().find(cmd => cmd.getAPIRoutePath() === path);
  }

  /**
   * Check if command exists
   */
  has(name: string): boolean {
    return this.commands.has(name);
  }

  /**
   * Remove a command
   */
  unregister(name: string): boolean {
    return this.commands.delete(name);
  }

  /**
   * Clear all commands
   */
  clear(): void {
    this.commands.clear();
  }

  /**
   * Get command count
   */
  get size(): number {
    return this.commands.size;
  }
}
