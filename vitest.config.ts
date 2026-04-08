import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Load the root git-init guard so accidental `git init` inside the project
    // is blocked. Without this, git absorbs nested .git dirs and sets core.bare=true
    // on the submodule config, breaking all subsequent git operations.
    setupFiles: [path.resolve(__dirname, '../../vitest.setup.esm.ts')],
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/index.ts'],
    },
  },
});
