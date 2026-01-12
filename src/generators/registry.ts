/**
 * Registry for managing generator plugins
 */

import type { GeneratorPlugin } from './types';

/**
 * Registry for managing generator plugins
 */
export class GeneratorRegistry {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private generators = new Map<string, GeneratorPlugin<any, any>>();

  register<T extends GeneratorPlugin<any, any>>(generator: T): this {
    if (this.generators.has(generator.name)) {
      throw new Error(`Generator "${generator.name}" is already registered`);
    }
    this.generators.set(generator.name, generator);
    return this;
  }

  get<T extends GeneratorPlugin<any, any> = GeneratorPlugin<any, any>>(name: string): T | undefined {
    return this.generators.get(name) as T | undefined;
  }

  getAll(): GeneratorPlugin<any, any>[] {
    return Array.from(this.generators.values());
  }

  has(name: string): boolean {
    return this.generators.has(name);
  }

  unregister(name: string): boolean {
    return this.generators.delete(name);
  }

  clear(): void {
    this.generators.clear();
  }

  get size(): number {
    return this.generators.size;
  }
}

// Default global registry
export const generatorRegistry = new GeneratorRegistry();
