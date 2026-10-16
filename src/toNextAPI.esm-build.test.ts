import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// The package is built once in vitest.global-setup.ts (into a temp dir, never dist/) and
// loaded here in plain node, as ESM and as CJS, the way consumers do. A bare
// require('next/server') in the ESM bundle throws there and turned every successful
// toNextAPI response into a 500.
const pkgDir = path.resolve(__dirname, '..');
const nextServer = path.join(pkgDir, 'node_modules/next/server.js');
let buildDir = '';
let isolatedDir = '';

// The probe reports facts read from the actual responses: constructor, cookies, status, body.
const probe = (load: string, opts: { noBuiltin?: boolean } = {}) => `
  ${opts.noBuiltin ? 'delete process.getBuiltinModule; if (process.getBuiltinModule) throw new Error("getBuiltinModule still defined");' : ''}
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
  const kind = (res) => ({
    plain: res.constructor === Response,
    hasCookies: 'cookies' in res,
  });
  const out = {};
  for (const m of ['GET', 'POST']) {
    const res = await mk(m, async () => ({ ok: true }))[m](req(m));
    out[m] = { status: res.status, body: await res.json(), ...kind(res) };
  }
  const err = await mk('GET', async () => {
    throw Object.assign(new Error('boom'), { details: { status: 418 } });
  }).GET(req('GET'));
  out.err = { status: err.status, body: await err.json(), ...kind(err) };
  console.log(JSON.stringify(out));
`;

function run(script: string, dir: string, ext: 'mjs' | 'cjs') {
  const body = ext === 'cjs' ? `(async () => {${script}})();` : script;
  const file = path.join(dir, `probe-${Math.random().toString(36).slice(2)}.${ext}`);
  fs.writeFileSync(file, body);
  const stdout = execFileSync(process.execPath, [file], { cwd: pkgDir, encoding: 'utf8' });
  return JSON.parse(stdout.trim().split('\n').pop()!);
}

const esm = (d: string) =>
  `import { UniversalCommand } from ${JSON.stringify(path.join(d, 'index.js'))};`;
const cjs = (d: string) =>
  `const { UniversalCommand } = require(${JSON.stringify(path.join(d, 'index.cjs'))});`;

const NEXT_OK = { status: 200, body: { ok: true }, plain: false, hasCookies: true };
const PLAIN_OK = { status: 200, body: { ok: true }, plain: true, hasCookies: false };
const ERR_BODY = { error: 'boom', details: { status: 418 } };

describe('built dist: toNextAPI in plain node', () => {
  beforeAll(() => {
    buildDir = process.env.UC_ESM_BUILD_DIR ?? '';
    expect(fs.existsSync(path.join(buildDir, 'index.js'))).toBe(true);
    // Same build copied outside any node_modules tree: `next` is not resolvable from here.
    isolatedDir = fs.mkdtempSync(path.join(os.tmpdir(), 'uc-esm-build-isolated-'));
    fs.cpSync(buildDir, isolatedDir, { recursive: true });
  });

  afterAll(() => {
    if (isolatedDir) fs.rmSync(isolatedDir, { recursive: true, force: true });
  });

  const cases: [string, 'mjs' | 'cjs', (d: string) => string, { noBuiltin?: boolean }][] = [
    ['ESM', 'mjs', esm, {}],
    ['ESM without process.getBuiltinModule (import fallback)', 'mjs', esm, { noBuiltin: true }],
    ['CJS', 'cjs', cjs, {}],
  ];
  for (const [label, ext, load, opts] of cases) {
    it(`${label}: 200 JSON via NextResponse, JSON error with details and status`, () => {
      const out = run(probe(load(buildDir), opts), buildDir, ext);
      expect(out.GET).toEqual(NEXT_OK);
      expect(out.POST).toEqual(NEXT_OK);
      expect(out.err).toMatchObject({
        status: 418,
        body: ERR_BODY,
        plain: false,
        hasCookies: true,
      });
    }, 60_000);
  }

  it('ESM without a resolvable next: plain 200 JSON Response, JSON error with details', () => {
    const out = run(probe(esm(isolatedDir)), isolatedDir, 'mjs');
    expect(out.GET).toEqual(PLAIN_OK);
    expect(out.POST).toEqual(PLAIN_OK);
    expect(out.err).toMatchObject({ status: 418, body: ERR_BODY, plain: true, hasCookies: false });
  }, 60_000);

  it('the built next/server is the one the repo resolves', () => {
    expect(fs.existsSync(nextServer)).toBe(true);
  });
});
