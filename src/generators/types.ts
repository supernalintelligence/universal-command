/**
 * Generator types and interfaces for Universal Command
 */

import type { CommandRegistry } from '../CommandRegistry';
import type { UniversalCommand } from '../UniversalCommand';

/**
 * Result of file generation
 */
export interface GeneratedFile {
  path: string;
  content: string;
  created: boolean;
}

/**
 * Base result type for generators
 */
export interface GeneratorResult {
  files: GeneratedFile[];
  errors?: Array<{ command: string; error: string }>;
}

/**
 * Base options for file-based generators
 */
export interface FileGeneratorOptions {
  outputDir: string;
  typescript?: boolean;
  dryRun?: boolean;
}

/**
 * Plugin interface for generators
 */
export interface GeneratorPlugin<
  TOptions extends Record<string, any> = FileGeneratorOptions,
  TResult = GeneratorResult
> {
  /** Unique identifier */
  readonly name: string;

  /** Human-readable description */
  readonly description: string;

  /** File extensions produced (e.g., ['.ts', '.js']) */
  readonly outputExtensions: string[];

  /** Generate for entire registry */
  generate(registry: CommandRegistry, options: TOptions): Promise<TResult>;

  /** Generate content for single command (optional, for preview) */
  generateContent?(command: UniversalCommand, options: TOptions): string;

  /** Validate options before generation */
  validateOptions?(options: TOptions): { valid: boolean; errors?: string[] };
}

/**
 * Abstract base class for file-based generators
 */
export abstract class FileGenerator<
  TOptions extends FileGeneratorOptions = FileGeneratorOptions
> implements GeneratorPlugin<TOptions, GeneratorResult> {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly outputExtensions: string[];

  abstract generateContent(command: UniversalCommand, options: TOptions): string;
  abstract getOutputPath(command: UniversalCommand, options: TOptions): string;

  async generate(
    registry: CommandRegistry,
    options: TOptions
  ): Promise<GeneratorResult> {
    const fs = await this.loadFS();
    const path = await this.loadPath();

    const result: GeneratorResult = { files: [] };

    for (const command of registry.getAll()) {
      try {
        const content = this.generateContent(command, options);
        const filePath = this.getOutputPath(command, options);

        if (!options.dryRun) {
          await fs.ensureDir(path.dirname(filePath));
          await fs.writeFile(filePath, content, 'utf-8');
        }

        result.files.push({ path: filePath, content, created: !options.dryRun });
      } catch (error: any) {
        result.errors = result.errors || [];
        result.errors.push({ command: command.schema.name, error: error.message });
      }
    }

    return result;
  }

  private async loadFS(): Promise<any> {
    try {
      return require('fs-extra');
    } catch {
      throw new Error('fs-extra is required. Install with: npm install fs-extra');
    }
  }

  private async loadPath(): Promise<typeof import('path')> {
    return require('path');
  }
}
