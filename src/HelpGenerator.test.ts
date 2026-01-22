/**
 * Tests for P1-9: Fast Help Generation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { HelpGenerator, generateHelp, generateMarkdownHelp } from './HelpGenerator';
import { UniversalCommand } from './UniversalCommand';
import { LazyUniversalCommand } from './LazyUniversalCommand';

describe('P1-9: Fast Help Generation', () => {
  describe('HelpGenerator', () => {
    let generator: HelpGenerator;

    beforeEach(() => {
      generator = new HelpGenerator();
    });

    it('should generate help from UniversalCommand', () => {
      const command = new UniversalCommand({
        name: 'deploy',
        description: 'Deploy application to environment',
        input: {
          parameters: [
            {
              name: 'environment',
              type: 'string',
              description: 'Target environment',
              required: true,
              positional: true,
            },
            {
              name: 'force',
              type: 'boolean',
              description: 'Force deployment',
              required: false,
            },
          ],
        },
        output: { type: 'json' },
        handler: async () => ({ deployed: true }),
      });

      const help = generator.generateHelp(command);

      expect(help).toContain('NAME');
      expect(help).toContain('deploy');
      expect(help).toContain('DESCRIPTION');
      expect(help).toContain('Deploy application');
      expect(help).toContain('USAGE');
      expect(help).toContain('<environment>');
      expect(help).toContain('PARAMETERS');
      expect(help).toContain('Positional:');
      expect(help).toContain('Options:');
      expect(help).toContain('--force');
    });

    it('should generate help from LazyUniversalCommand WITHOUT loading handler', () => {
      const command = new LazyUniversalCommand({
        name: 'test',
        description: 'Run tests',
        handlerPath: './fake-handler', // Handler will NOT be loaded
        input: {
          parameters: [
            {
              name: 'pattern',
              type: 'string',
              description: 'Test pattern',
              required: false,
            },
          ],
        },
        output: { type: 'text' },
      });

      // Verify handler NOT loaded
      expect(command.isHandlerLoaded()).toBe(false);

      const help = generator.generateHelp(command);

      // Verify help generated WITHOUT loading handler
      expect(command.isHandlerLoaded()).toBe(false);

      expect(help).toContain('test');
      expect(help).toContain('Run tests');
      expect(help).toContain('--pattern');
    });

    it('should format positional arguments correctly', () => {
      const command = new UniversalCommand({
        name: 'copy',
        description: 'Copy file',
        input: {
          parameters: [
            {
              name: 'source',
              type: 'string',
              description: 'Source file',
              required: true,
              positional: true,
              position: 0,
            },
            {
              name: 'dest',
              type: 'string',
              description: 'Destination file',
              required: true,
              positional: true,
              position: 1,
            },
          ],
        },
        output: { type: 'text' },
        handler: async () => 'copied',
      });

      const help = generator.generateHelp(command);

      expect(help).toContain('USAGE');
      expect(help).toContain('copy <source> <dest>');
      expect(help).toContain('Positional:');
      expect(help).toContain('<source>');
      expect(help).toContain('<dest>');
    });

    it('should format variadic arguments correctly', () => {
      const command = new UniversalCommand({
        name: 'concat',
        description: 'Concatenate files',
        input: {
          parameters: [
            {
              name: 'files',
              type: 'array',
              description: 'Files to concatenate',
              required: true,
              positional: true,
              variadic: true,
            },
          ],
        },
        output: { type: 'text' },
        handler: async () => 'concatenated',
      });

      const help = generator.generateHelp(command);

      expect(help).toContain('<files...>');
    });

    it('should format optional positional arguments correctly', () => {
      const command = new UniversalCommand({
        name: 'log',
        description: 'Show logs',
        input: {
          parameters: [
            {
              name: 'service',
              type: 'string',
              description: 'Service name',
              required: false,
              positional: true,
            },
          ],
        },
        output: { type: 'text' },
        handler: async () => 'logs',
      });

      const help = generator.generateHelp(command);

      expect(help).toContain('[service]'); // Optional bracket notation
    });

    it('should show parameter metadata', () => {
      const command = new UniversalCommand({
        name: 'config',
        description: 'Set config',
        input: {
          parameters: [
            {
              name: 'level',
              type: 'string',
              description: 'Log level',
              required: true,
              default: 'info',
              enum: ['debug', 'info', 'warn', 'error'],
            },
          ],
        },
        output: { type: 'text' },
        handler: async () => 'configured',
      });

      const help = generator.generateHelp(command);

      expect(help).toContain('required');
      expect(help).toContain('default: info');
      expect(help).toContain('choices:');
      expect(help).toContain('debug');
      expect(help).toContain('info');
      expect(help).toContain('warn');
      expect(help).toContain('error');
    });

    it('should support extended help mode', () => {
      const generator = new HelpGenerator({ extended: true });

      const command = new UniversalCommand({
        name: 'test',
        description: 'Test command',
        category: 'testing',
        keywords: ['test', 'spec', 'jest'],
        input: { parameters: [] },
        output: { type: 'text' },
        handler: async () => 'done',
      });

      const help = generator.generateHelp(command);

      expect(help).toContain('CATEGORY');
      expect(help).toContain('testing');
      expect(help).toContain('KEYWORDS');
      expect(help).toContain('test, spec, jest');
    });

    it('should show examples when available', () => {
      const command = new UniversalCommand({
        name: 'deploy',
        description: 'Deploy app',
        cli: {
          examples: [
            'deploy production',
            'deploy staging --force',
            'deploy dev --verbose',
          ],
        },
        input: { parameters: [] },
        output: { type: 'text' },
        handler: async () => 'deployed',
      });

      const help = generator.generateHelp(command);

      expect(help).toContain('EXAMPLES');
      expect(help).toContain('deploy production');
      expect(help).toContain('deploy staging --force');
    });

    it('should hide examples when disabled', () => {
      const generator = new HelpGenerator({ showExamples: false });

      const command = new UniversalCommand({
        name: 'deploy',
        description: 'Deploy app',
        cli: {
          examples: ['deploy production'],
        },
        input: { parameters: [] },
        output: { type: 'text' },
        handler: async () => 'deployed',
      });

      const help = generator.generateHelp(command);

      expect(help).not.toContain('EXAMPLES');
    });
  });

  describe('Command List Generation', () => {
    it('should generate list of multiple commands', () => {
      const generator = new HelpGenerator();

      const cmd1 = new UniversalCommand({
        name: 'start',
        description: 'Start server',
        input: { parameters: [] },
        output: { type: 'text' },
        handler: async () => 'started',
      });

      const cmd2 = new UniversalCommand({
        name: 'stop',
        description: 'Stop server',
        input: { parameters: [] },
        output: { type: 'text' },
        handler: async () => 'stopped',
      });

      const list = generator.generateCommandList([cmd1, cmd2]);

      expect(list).toContain('COMMANDS');
      expect(list).toContain('start');
      expect(list).toContain('Start server');
      expect(list).toContain('stop');
      expect(list).toContain('Stop server');
    });
  });

  describe('Markdown Generation', () => {
    it('should generate markdown help', () => {
      const generator = new HelpGenerator();

      const command = new UniversalCommand({
        name: 'deploy',
        description: 'Deploy application',
        input: {
          parameters: [
            {
              name: 'environment',
              type: 'string',
              description: 'Target environment',
              required: true,
              positional: true,
            },
          ],
        },
        output: { type: 'json' },
        handler: async () => ({ deployed: true }),
      });

      const markdown = generator.generateMarkdown(command);

      expect(markdown).toContain('# deploy');
      expect(markdown).toContain('## Usage');
      expect(markdown).toContain('```bash');
      expect(markdown).toContain('deploy <environment>');
      expect(markdown).toContain('## Parameters');
      expect(markdown).toContain('| Parameter | Type | Required | Description |');
    });

    it('should generate markdown parameter table', () => {
      const generator = new HelpGenerator();

      const command = new UniversalCommand({
        name: 'config',
        description: 'Configure settings',
        input: {
          parameters: [
            {
              name: 'key',
              type: 'string',
              description: 'Config key',
              required: true,
            },
            {
              name: 'value',
              type: 'string',
              description: 'Config value',
              required: false,
            },
          ],
        },
        output: { type: 'json' },
        handler: async () => ({ set: true }),
      });

      const markdown = generator.generateMarkdown(command);

      expect(markdown).toContain('| `--key` | `string` | ✓ | Config key |');
      expect(markdown).toContain('| `--value` | `string` |  | Config value |');
    });

    it('should include examples in markdown', () => {
      const generator = new HelpGenerator();

      const command = new UniversalCommand({
        name: 'deploy',
        description: 'Deploy app',
        cli: {
          examples: ['deploy production', 'deploy staging --force'],
        },
        input: { parameters: [] },
        output: { type: 'text' },
        handler: async () => 'deployed',
      });

      const markdown = generator.generateMarkdown(command);

      expect(markdown).toContain('## Examples');
      expect(markdown).toContain('```bash\ndeploy production\n```');
      expect(markdown).toContain('```bash\ndeploy staging --force\n```');
    });
  });

  describe('Quick Helpers', () => {
    it('generateHelp should work as shortcut', () => {
      const command = new UniversalCommand({
        name: 'test',
        description: 'Test command',
        input: { parameters: [] },
        output: { type: 'text' },
        handler: async () => 'done',
      });

      const help = generateHelp(command);

      expect(help).toContain('test');
      expect(help).toContain('Test command');
    });

    it('generateMarkdownHelp should work as shortcut', () => {
      const command = new UniversalCommand({
        name: 'test',
        description: 'Test command',
        input: { parameters: [] },
        output: { type: 'text' },
        handler: async () => 'done',
      });

      const markdown = generateMarkdownHelp(command);

      expect(markdown).toContain('# test');
      expect(markdown).toContain('Test command');
    });
  });

  describe('Performance', () => {
    it('should generate help for 100 commands quickly', () => {
      const generator = new HelpGenerator();

      const commands = Array.from({ length: 100 }, (_, i) => {
        return new LazyUniversalCommand({
          name: `command-${i}`,
          description: `Command ${i} description`,
          handlerPath: `./handler-${i}`,
          input: {
            parameters: [
              {
                name: 'arg',
                type: 'string',
                description: 'Argument',
                required: true,
              },
            ],
          },
          output: { type: 'json' },
        });
      });

      const start = Date.now();

      for (const command of commands) {
        generator.generateHelp(command);
      }

      const duration = Date.now() - start;

      // Should be FAST (< 100ms for 100 commands)
      expect(duration).toBeLessThan(100);

      // Verify handlers NOT loaded
      for (const command of commands) {
        expect(command.isHandlerLoaded()).toBe(false);
      }
    });

    it('should generate command list for 100 commands quickly', () => {
      const generator = new HelpGenerator();

      const commands = Array.from({ length: 100 }, (_, i) => {
        return new LazyUniversalCommand({
          name: `command-${i}`,
          description: `Command ${i}`,
          handlerPath: `./handler-${i}`,
          input: { parameters: [] },
          output: { type: 'text' },
        });
      });

      const start = Date.now();
      const list = generator.generateCommandList(commands);
      const duration = Date.now() - start;

      // Should be VERY fast (< 10ms for 100 commands)
      expect(duration).toBeLessThan(10);

      expect(list).toContain('command-0');
      expect(list).toContain('command-99');
    });
  });
});
