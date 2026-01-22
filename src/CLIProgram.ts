/**
 * CLIProgram - P1-8: Global Options and Hooks
 *
 * Creates a CLI program with:
 * - Global options (--verbose, --config, etc.)
 * - Lifecycle hooks (beforeCommand, afterCommand, onError)
 * - Nested command registration
 */

import { UniversalCommand } from './UniversalCommand';
import type { ExecutionContext } from './types';

/**
 * Global option definition
 */
export interface GlobalOption {
  /** Option name (without --) */
  name: string;

  /** Option description */
  description: string;

  /** Short flag (single letter, without -) */
  short?: string;

  /** Default value */
  default?: any;

  /** Whether option is required */
  required?: boolean;

  /** Option type */
  type?: 'string' | 'boolean' | 'number';
}

/**
 * Lifecycle hooks for command execution
 */
export interface CLIHooks {
  /**
   * Called before any command executes
   * Can modify context or throw to prevent execution
   */
  beforeCommand?: (commandName: string, args: any, context: ExecutionContext) => Promise<void> | void;

  /**
   * Called after command executes successfully
   * Can perform cleanup or logging
   */
  afterCommand?: (commandName: string, result: any, context: ExecutionContext) => Promise<void> | void;

  /**
   * Called when command throws an error
   * Can transform error or perform error logging
   */
  onError?: (commandName: string, error: Error, context: ExecutionContext) => Promise<void> | void;
}

/**
 * CLI Program options
 */
export interface CLIProgramOptions {
  /** Program name (e.g., 'sc', 'git') */
  name: string;

  /** Program description */
  description: string;

  /** Program version */
  version: string;

  /** Global options available to all commands */
  globalOptions?: GlobalOption[];

  /** Lifecycle hooks */
  hooks?: CLIHooks;

  /** Whether to enable debug mode output */
  debug?: boolean;
}

/**
 * CLIProgram wraps Commander with global options and hooks
 */
export class CLIProgram {
  private program: any; // Commander.Command
  private options: CLIProgramOptions;
  private commands: Map<string, UniversalCommand> = new Map();

  constructor(options: CLIProgramOptions) {
    this.options = options;

    // Lazy load commander
    let Command: any;
    try {
      Command = require('commander').Command;
    } catch {
      throw new Error(
        'commander package is required for CLI generation. Install with: npm install commander'
      );
    }

    // Create program
    this.program = new Command();
    this.program.name(options.name);
    this.program.description(options.description);
    this.program.version(options.version);

    // Add global options
    if (options.globalOptions) {
      for (const option of options.globalOptions) {
        this.addGlobalOption(option);
      }
    }

    // Add hook for before command (using Commander's hook)
    if (options.hooks?.beforeCommand) {
      this.program.hook('preAction', async (thisCommand: any, actionCommand: any) => {
        const commandName = actionCommand.name();
        const args = actionCommand.opts();
        const context: ExecutionContext = {
          interface: 'cli',
          globalOptions: this.program.opts(), // Pass global options in context
        };

        await options.hooks!.beforeCommand!(commandName, args, context);
      });
    }

    // Add hook for after command
    if (options.hooks?.afterCommand) {
      this.program.hook('postAction', async (thisCommand: any, actionCommand: any) => {
        const commandName = actionCommand.name();
        const context: ExecutionContext = {
          interface: 'cli',
          globalOptions: this.program.opts(),
        };

        // Result is not easily accessible in postAction, so we'll handle this differently
        // by wrapping command actions
      });
    }
  }

  /**
   * Add a global option to the program
   */
  private addGlobalOption(option: GlobalOption): void {
    const flags = option.short
      ? `-${option.short}, --${option.name}${option.type !== 'boolean' ? ` <${option.name}>` : ''}`
      : `--${option.name}${option.type !== 'boolean' ? ` <${option.name}>` : ''}`;

    if (option.required) {
      this.program.requiredOption(flags, option.description);
    } else {
      this.program.option(flags, option.description, option.default);
    }
  }

  /**
   * Register a UniversalCommand with the program
   */
  register(command: UniversalCommand): this {
    const commandName = command.schema.name;
    this.commands.set(commandName, command);

    // Get CLI command from UniversalCommand
    const cliCommand = command.toCLI();

    // Wrap the action to inject global options and hooks
    const originalAction = (cliCommand as any)._actionHandler;
    if (originalAction) {
      (cliCommand as any)._actionHandler = this.wrapAction(commandName, originalAction);
    }

    // Add to program
    this.program.addCommand(cliCommand);

    return this;
  }

  /**
   * Register multiple commands at once
   */
  registerAll(commands: UniversalCommand[]): this {
    for (const command of commands) {
      this.register(command);
    }
    return this;
  }

  /**
   * Wrap command action with hooks
   */
  private wrapAction(commandName: string, originalAction: Function): Function {
    return async (...args: any[]) => {
      const context: ExecutionContext = {
        interface: 'cli',
        globalOptions: this.program.opts(), // Include global options
      };

      try {
        // beforeCommand hook (if not already handled by Commander hook)
        if (this.options.hooks?.beforeCommand) {
          const commandArgs = args[args.length - 2]; // Commander passes options as second-to-last
          await this.options.hooks.beforeCommand(commandName, commandArgs, context);
        }

        // Execute original action
        const result = await originalAction(...args);

        // afterCommand hook
        if (this.options.hooks?.afterCommand) {
          await this.options.hooks.afterCommand(commandName, result, context);
        }

        return result;
      } catch (error: any) {
        // onError hook
        if (this.options.hooks?.onError) {
          await this.options.hooks.onError(commandName, error, context);
        }

        // Re-throw after hook
        throw error;
      }
    };
  }

  /**
   * Parse CLI arguments and execute
   */
  async parse(argv?: string[]): Promise<void> {
    await this.program.parseAsync(argv || process.argv);
  }

  /**
   * Get the underlying Commander program
   * Use for advanced customization
   */
  getProgram(): any {
    return this.program;
  }

  /**
   * Get global option values
   */
  getGlobalOptions(): Record<string, any> {
    return this.program.opts();
  }
}

/**
 * Create a new CLI program
 */
export function createCLIProgram(options: CLIProgramOptions): CLIProgram {
  return new CLIProgram(options);
}
