import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Builds the package into a temp dir (never the shared dist/) and loads it in plain
// node, as ESM and as CJS, the way consumers do. A bare require('next/server') in the
// ESM bundle throws there and turned every successful toNextAPI response into a 500.
const pkgDir = path.resolve(__dirname, '..');
const tsupBin = path.join(pkgDir, 'node_modules/tsup/dist/cli-default.js');
let outDir = '';
let isolatedDir = '';

const probe = (load: string, nextPath: string | null) => `
  ${load}
  const mk = (method, handler) => new UniversalCommand({
    name: 'esm-probe', description: 'probe',
    input: { parameters: [] }, output: { type: 'json' },
    api: { method }, handler,
  }).toNextAPI();
  const req = (method) => ({
    method, headers: new Headers(), nextUrl: new URL('http://localhost/x'),
    json: async () => ({}),
  });
  const NextResponse = ${nextPath ? `((m) => m.NextResponse ?? m.default?.NextResponse)(await import(${JSON.stringify(nextPath)}))` : 'null'};
  const out = {};
  for (const m of ['GET', 'POST']) {
    const res = await mk(m, async () => ({ ok: true }))[m](req(m));
    out[m] = { status: res.status, body: await res.json(), isNext: NextResponse ? res instanceof NextResponse : false };
  }
  const err = await mk('GET', async () => {
    throw Object.assign(new Error('boom'), { details: { status: 418 } });
  }).GET(req('GET'));
  out.err = { status: err.status, body: await err.json() };
  console.log(JSON.stringify(out));
`;

function run(script: string, ext: 'mjs' | 'cjs') {
  const file = path.join(outDir, `probe.${ext}`);
  fs.writeFileSync(file, script);
  const stdout = execFileSync(process.execPath, [file], { cwd: pkgDir, encoding: 'utf8' });
  return JSON.parse(stdout.trim().split('\n').pop()!);
}

describe('built dist: toNextAPI in plain node', () => {
  beforeAll(() => {
    // Inside the package tree so `next` resolves from the build, like a real install.
    const cache = path.join(pkgDir, 'node_modules', '.cache');
    fs.mkdirSync(cache, { recursive: true });
    outDir = fs.mkdtempSync(path.join(cache, 'uc-esm-build-'));
    execFileSync(process.execPath, [tsupBin, '--out-dir', outDir, '--no-dts', '--no-sourcemap'], {
      cwd: pkgDir,
      stdio: 'pipe',
    });
    // Same build copied outside any node_modules tree: `next` is not resolvable from here.
    isolatedDir = fs.mkdtempSync(path.join(os.tmpdir(), 'uc-esm-isolated-'));
    fs.cpSync(outDir, isolatedDir, { recursive: true });
  }, 240_000);

  afterAll(() => {
    for (const d of [outDir, isolatedDir]) if (d) fs.rmSync(d, { recursive: true, force: true });
  });

  const nextServer = path.join(pkgDir, 'node_modules/next/server.js');

  for (const [label, ext, load] of [
    [
      'ESM',
      'mjs',
      (d: string) =>
        `import { UniversalCommand } from ${JSON.stringify(path.join(d, 'index.js'))};`,
    ],
    [
      'CJS',
      'cjs',
      (d: string) =>
        `const { UniversalCommand } = require(${JSON.stringify(path.join(d, 'index.cjs'))});`,
    ],
  ] as const) {
    it(`${label}: 200 JSON via NextResponse, and a JSON error with details and status`, () => {
      const script = probe(load(outDir), nextServer);
      // CJS has no top-level await: wrap it
      const body = ext === 'cjs' ? `(async () => {${script}})();` : script;
      const out = run(body, ext);
      for (const m of ['GET', 'POST']) {
        expect(out[m]).toEqual({ status: 200, body: { ok: true }, isNext: true });
      }
      expect(out.err).toEqual({ status: 418, body: { error: 'boom', details: { status: 418 } } });
    }, 60_000);
  }

  it('ESM without a resolvable next: plain 200 JSON Response, JSON error with details', () => {
    const load = `import { UniversalCommand } from ${JSON.stringify(path.join(isolatedDir, 'index.js'))};`;
    const out = run(probe(load, null), 'mjs');
    for (const m of ['GET', 'POST']) {
      expect(out[m]).toEqual({ status: 200, body: { ok: true }, isNext: false });
    }
    expect(out.err).toEqual({ status: 418, body: { error: 'boom', details: { status: 418 } } });
  }, 60_000);
});
