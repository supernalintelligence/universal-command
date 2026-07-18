import { defineConfig } from 'vitest/config';
import fs from 'fs';
import path from 'path';

// Load the monorepo root's git-init guard when this package is checked out
// inside the supernal-coding monorepo, so accidental `git init` inside the
// shared checkout is blocked (git absorbs nested .git dirs and sets
// core.bare=true on the submodule config, breaking all subsequent git
// operations). This file lives two directories up ONLY in that context —
// a standalone checkout of this package's own repo (e.g. a fresh CI clone
// for `npm publish`) has no such file and doesn't need the guard, since it
// isn't a multi-agent monorepo with submodules of its own.
const monorepoGitInitGuard = path.resolve(__dirname, '../../vitest.setup.esm.ts');
const setupFiles = fs.existsSync(monorepoGitInitGuard) ? [monorepoGitInitGuard] : [];

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles,
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/index.ts'],
    },
  },
});
