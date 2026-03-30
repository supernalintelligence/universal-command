/**
 * OpenAPI 3.0 specification generator
 */

import type { GeneratorPlugin, GeneratorResult } from '../types';
import type { CommandRegistry } from '../../CommandRegistry';
import type { UniversalCommand } from '../../UniversalCommand';

export interface OpenAPIOptions {
  outputPath: string;
  title?: string;
  version?: string;
  description?: string;
  servers?: Array<{ url: string; description?: string }>;
  format?: 'yaml' | 'json';
  dryRun?: boolean;
}

export class OpenAPIGenerator implements GeneratorPlugin<OpenAPIOptions, GeneratorResult> {
  readonly name = 'openapi';
  readonly description = 'Generate OpenAPI 3.0 specification';
  readonly outputExtensions = ['.yaml', '.json'];

  async generate(
    registry: CommandRegistry,
    options: OpenAPIOptions
  ): Promise<GeneratorResult> {
    const spec = this.generateSpec(registry, options);
    const content = options.format === 'json'
      ? JSON.stringify(spec, null, 2)
      : this.toYAML(spec);

    if (!options.dryRun) {
      const fs = require('fs-extra');
      const path = require('path');
      await fs.ensureDir(path.dirname(options.outputPath));
      await fs.writeFile(options.outputPath, content, 'utf-8');
    }

    return {
      files: [{
        path: options.outputPath,
        content,
        created: !options.dryRun
      }]
    };
  }

  private generateSpec(registry: CommandRegistry, options: OpenAPIOptions): object {
    const paths: Record<string, any> = {};

    for (const command of registry.getAll()) {
      const routePath = '/' + command.getAPIRoutePath();
      const method = (command.schema.api?.method || 'GET').toLowerCase();

      paths[routePath] = paths[routePath] || {};
      paths[routePath][method] = this.commandToOperation(command);
    }

    return {
      openapi: '3.0.3',
      info: {
        title: options.title || 'API',
        version: options.version || '1.0.0',
        description: options.description
      },
      servers: options.servers || [{ url: 'http://localhost:3000' }],
      paths
    };
  }

  private commandToOperation(command: UniversalCommand): object {
    const params = command.schema.input.parameters || [];
    const method = (command.schema.api?.method || 'GET').toLowerCase();

    const operation: any = {
      operationId: command.schema.name.replace(/\s+/g, '_'),
      summary: command.schema.description,
      responses: {
        '200': {
          description: 'Successful response',
          content: {
            'application/json': {
              schema: command.schema.output.schema || { type: 'object' }
            }
          }
        }
      }
    };

    if (command.schema.category) {
      operation.tags = [command.schema.category];
    }

    if (method === 'get' && params.length > 0) {
      operation.parameters = params.map(p => ({
        name: p.name,
        in: 'query',
        required: p.required || false,
        description: p.description,
        schema: {
          type: p.type,
          ...(p.enum && { enum: p.enum }),
          ...(p.default !== undefined && { default: p.default })
        }
      }));
    } else if (method !== 'get' && params.length > 0) {
      const properties: Record<string, any> = {};
      const required: string[] = [];

      for (const p of params) {
        properties[p.name] = {
          type: p.type,
          description: p.description,
          ...(p.enum && { enum: p.enum }),
          ...(p.default !== undefined && { default: p.default })
        };
        if (p.required) {
          required.push(p.name);
        }
      }

      operation.requestBody = {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties,
              ...(required.length > 0 && { required })
            }
          }
        }
      };
    }

    return operation;
  }

  private toYAML(obj: object): string {
    const lines: string[] = [];
    this.serializeYAML(obj, lines, 0);
    return lines.join('\n');
  }

  private serializeYAML(value: any, lines: string[], indent: number): void {
    const prefix = '  '.repeat(indent);

    if (value === null || value === undefined) {
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'object' && item !== null) {
          lines.push(`${prefix}-`);
          this.serializeYAML(item, lines, indent + 1);
        } else {
          lines.push(`${prefix}- ${this.formatYAMLValue(item)}`);
        }
      }
    } else if (typeof value === 'object') {
      for (const [key, val] of Object.entries(value)) {
        if (val === undefined) continue;
        if (typeof val === 'object' && val !== null) {
          lines.push(`${prefix}${key}:`);
          this.serializeYAML(val, lines, indent + 1);
        } else {
          lines.push(`${prefix}${key}: ${this.formatYAMLValue(val)}`);
        }
      }
    }
  }

  private formatYAMLValue(value: any): string {
    if (typeof value === 'string') {
      // Quote strings that might be interpreted as other types
      if (value === '' || value.includes(':') || value.includes('#') ||
          value.startsWith(' ') || value.endsWith(' ') ||
          /^[\d.]+$/.test(value) || ['true', 'false', 'null'].includes(value.toLowerCase())) {
        return `"${value.replace(/"/g, '\\"')}"`;
      }
      return value;
    }
    return String(value);
  }
}
