/**
 * HelpGenerator - P1-9: Fast Help Generation
 *
 * Generates help text from command metadata without loading handlers.
 * Critical for fast CLI startup - help should not trigger handler loading.
 */

import type { CommandSchema, Parameter } from './types';
import type { LazyUniversalCommand } from './LazyUniversalCommand';
import type { UniversalCommand } from './UniversalCommand';

/**
 * Help formatting options
 */
export interface HelpOptions {
  /** Maximum line width */
  width?: number;

  /** Whether to show examples */
  showExamples?: boolean;

  /** Whether to show extended help */
  extended?: boolean;

  /** Whether to use colors (ANSI codes) */
  colors?: boolean;
}

/**
 * HelpGenerator generates help text from command metadata
 */
export class HelpGenerator {
  private options: Required<HelpOptions>;

  constructor(options: HelpOptions = {}) {
    this.options = {
      width: options.width ?? 80,
      showExamples: options.showExamples ?? true,
      extended: options.extended ?? false,
      colors: options.colors ?? false,
    };
  }

  /**
   * Generate help for a command (without loading handler)
   */
  generateHelp(command: UniversalCommand | LazyUniversalCommand): string {
    // Use getMetadata() if available (LazyUniversalCommand)
    const metadata =
      'getMetadata' in command && typeof command.getMetadata === 'function'
        ? command.getMetadata()
        : command.schema;

    const sections: string[] = [];

    // Name and description
    sections.push(this.formatSection('NAME', metadata.name));
    sections.push('');
    sections.push(this.formatSection('DESCRIPTION', metadata.description));
    sections.push('');

    // Usage
    const usage = this.generateUsage(metadata);
    sections.push(this.formatSection('USAGE', usage));
    sections.push('');

    // Parameters
    if (metadata.input.parameters && metadata.input.parameters.length > 0) {
      const params = this.formatParameters(metadata.input.parameters);
      sections.push(this.formatSection('PARAMETERS', params));
      sections.push('');
    }

    // Output
    sections.push(this.formatSection('OUTPUT', `Type: ${metadata.output.type}`));
    sections.push('');

    // Extended info (optional)
    if (this.options.extended) {
      if (metadata.category) {
        sections.push(this.formatSection('CATEGORY', metadata.category));
        sections.push('');
      }

      if (metadata.keywords && metadata.keywords.length > 0) {
        sections.push(this.formatSection('KEYWORDS', metadata.keywords.join(', ')));
        sections.push('');
      }
    }

    // Examples (if available and enabled)
    if (this.options.showExamples && metadata.cli?.examples) {
      const examples = this.formatExamples(metadata.cli.examples);
      sections.push(this.formatSection('EXAMPLES', examples));
      sections.push('');
    }

    return sections.join('\n');
  }

  /**
   * Generate usage line
   */
  private generateUsage(metadata: any): string {
    const commandPath = metadata.cli?.path || metadata.name.split(' ');
    const commandName = commandPath.join(' ');

    const parts: string[] = [commandName];

    // Add positional arguments
    const positional = metadata.input.parameters
      .filter((p: Parameter) => p.positional)
      .sort((a: Parameter, b: Parameter) => {
        const posA = a.position !== undefined ? a.position : Infinity;
        const posB = b.position !== undefined ? b.position : Infinity;
        return posA - posB;
      });

    for (const param of positional) {
      if (param.variadic) {
        parts.push(param.required ? `<${param.name}...>` : `[${param.name}...]`);
      } else {
        parts.push(param.required ? `<${param.name}>` : `[${param.name}]`);
      }
    }

    // Add option flags indicator
    const hasOptions = metadata.input.parameters.some((p: Parameter) => !p.positional);
    if (hasOptions) {
      parts.push('[options]');
    }

    return parts.join(' ');
  }

  /**
   * Format parameters section
   */
  private formatParameters(parameters: Parameter[]): string {
    const lines: string[] = [];

    // Separate positional from options
    const positional = parameters.filter(p => p.positional);
    const options = parameters.filter(p => !p.positional);

    if (positional.length > 0) {
      lines.push('Positional:');
      for (const param of positional) {
        lines.push(this.formatParameter(param, true));
      }
      lines.push('');
    }

    if (options.length > 0) {
      lines.push('Options:');
      for (const param of options) {
        lines.push(this.formatParameter(param, false));
      }
    }

    return lines.join('\n');
  }

  /**
   * Format single parameter
   */
  private formatParameter(param: Parameter, isPositional: boolean): string {
    const parts: string[] = [];

    if (isPositional) {
      // Positional: <name> or [name]
      const syntax = param.required ? `<${param.name}>` : `[${param.name}]`;
      parts.push(`  ${syntax.padEnd(20)}`);
    } else {
      // Option: --name <value>
      const syntax = `--${param.name}${param.type !== 'boolean' ? ` <${param.type}>` : ''}`;
      parts.push(`  ${syntax.padEnd(20)}`);
    }

    // Description
    parts.push(param.description);

    // Metadata
    const meta: string[] = [];
    if (param.required) meta.push('required');
    if (param.default !== undefined) meta.push(`default: ${param.default}`);
    if (param.enum) meta.push(`choices: ${param.enum.join(', ')}`);

    if (meta.length > 0) {
      parts.push(`(${meta.join(', ')})`);
    }

    return parts.join(' ');
  }

  /**
   * Format examples section
   */
  private formatExamples(examples: string[]): string {
    return examples.map((ex, i) => `  ${i + 1}. ${ex}`).join('\n');
  }

  /**
   * Format section with header
   */
  private formatSection(header: string, content: string): string {
    const headerText = this.options.colors
      ? `\x1b[1m${header}\x1b[0m` // Bold
      : header;

    return `${headerText}\n  ${content}`;
  }

  /**
   * Generate help for multiple commands (command list)
   */
  generateCommandList(commands: (UniversalCommand | LazyUniversalCommand)[]): string {
    const lines: string[] = [];

    lines.push('COMMANDS');
    lines.push('');

    for (const command of commands) {
      const metadata =
        'getMetadata' in command && typeof command.getMetadata === 'function'
          ? command.getMetadata()
          : command.schema;

      const name = metadata.name.padEnd(20);
      const desc = metadata.description || '';

      lines.push(`  ${name}  ${desc}`);
    }

    return lines.join('\n');
  }

  /**
   * Generate markdown help (for documentation)
   */
  generateMarkdown(command: UniversalCommand | LazyUniversalCommand): string {
    const metadata =
      'getMetadata' in command && typeof command.getMetadata === 'function'
        ? command.getMetadata()
        : command.schema;

    const sections: string[] = [];

    // Title
    sections.push(`# ${metadata.name}`);
    sections.push('');

    // Description
    sections.push(metadata.description);
    sections.push('');

    // Usage
    const usage = this.generateUsage(metadata);
    sections.push('## Usage');
    sections.push('');
    sections.push('```bash');
    sections.push(usage);
    sections.push('```');
    sections.push('');

    // Parameters
    if (metadata.input.parameters && metadata.input.parameters.length > 0) {
      sections.push('## Parameters');
      sections.push('');
      sections.push(this.generateMarkdownParameters(metadata.input.parameters));
      sections.push('');
    }

    // Examples
    if (metadata.cli?.examples && metadata.cli.examples.length > 0) {
      sections.push('## Examples');
      sections.push('');
      for (const example of metadata.cli.examples) {
        sections.push('```bash');
        sections.push(example);
        sections.push('```');
        sections.push('');
      }
    }

    return sections.join('\n');
  }

  /**
   * Generate markdown parameter table
   */
  private generateMarkdownParameters(parameters: Parameter[]): string {
    const lines: string[] = [];

    lines.push('| Parameter | Type | Required | Description |');
    lines.push('|-----------|------|----------|-------------|');

    for (const param of parameters) {
      const name = param.positional ? `\`<${param.name}>\`` : `\`--${param.name}\``;
      const type = `\`${param.type}\``;
      const required = param.required ? '✓' : '';
      const desc = param.description;

      lines.push(`| ${name} | ${type} | ${required} | ${desc} |`);
    }

    return lines.join('\n');
  }
}

/**
 * Create a help generator
 */
export function createHelpGenerator(options?: HelpOptions): HelpGenerator {
  return new HelpGenerator(options);
}

/**
 * Quick helper: Generate help for a command
 */
export function generateHelp(
  command: UniversalCommand | LazyUniversalCommand,
  options?: HelpOptions
): string {
  const generator = new HelpGenerator(options);
  return generator.generateHelp(command);
}

/**
 * Quick helper: Generate markdown help for a command
 */
export function generateMarkdownHelp(
  command: UniversalCommand | LazyUniversalCommand,
  options?: HelpOptions
): string {
  const generator = new HelpGenerator(options);
  return generator.generateMarkdown(command);
}
