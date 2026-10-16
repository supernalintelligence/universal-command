import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PREFIX = 'uc-esm-build-';
const MAX_AGE_MS = 60 * 60 * 1000;
const pkgDir = __dirname;
const cacheDir = path.join(pkgDir, 'node_modules', '.cache');
let buildDir = '';

function sweepStale(root: string) {
  if (!fs.existsSync(root)) return;
  for (const name of fs.readdirSync(root)) {
    if (!name.startsWith(PREFIX)) continue;
    const full = path.join(root, name);
    try {
      if (Date.now() - fs.statSync(full).mtimeMs > MAX_AGE_MS) {
        fs.rmSync(full, { recursive: true, force: true });
      }
    } catch {
      // another run may be removing it
    }
  }
}

// Builds the package once, into a temp dir (never dist/), for src/toNextAPI.esm-build.test.ts.
export function setup() {
  sweepStale(cacheDir);
  sweepStale(os.tmpdir());
  // Inside the package tree so `next` resolves from the build, like a real install.
  fs.mkdirSync(cacheDir, { recursive: true });
  buildDir = fs.mkdtempSync(path.join(cacheDir, PREFIX));
  execFileSync(
    process.execPath,
    [
      path.join(pkgDir, 'node_modules/tsup/dist/cli-default.js'),
      '--out-dir',
      buildDir,
      '--no-dts',
      '--no-sourcemap',
    ],
    { cwd: pkgDir, stdio: 'pipe' }
  );
  process.env.UC_ESM_BUILD_DIR = buildDir;
}

export function teardown() {
  if (buildDir) fs.rmSync(buildDir, { recursive: true, force: true });
}
