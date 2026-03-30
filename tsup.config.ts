/**
 * tsup configuration for building the package
 */

import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'codegen/index': 'src/codegen/index.ts',
    'generators/index': 'src/generators/index.ts',
    'mcp/index': 'src/mcp/index.ts',
    'testing/index': 'src/testing/index.ts',
    'runtime/index': 'src/runtime/index.ts',
    'scopes/index': 'src/scopes/index.ts'
  },
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  external: [
    'commander',
    'next',
    'next/server',
    '@modelcontextprotocol/sdk'
  ]
});
