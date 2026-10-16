import { describe, it, expect, beforeAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

// Builds the package and imports the built ESM bundle in a plain node process,
// the way the dashboard loads it. A bare require('next/server') in the bundle
// throws there and turns every successful toNextAPI response into a 500.
const pkgDir = path.resolve(__dirname, '..');

describe('built ESM dist: toNextAPI', () => {
  beforeAll(() => {
    execFileSync('pnpm', ['run', 'build'], { cwd: pkgDir, stdio: 'pipe' });
  }, 240_000);

  it('returns status 200 with the JSON body from GET and POST', () => {
    const script = `
      import { UniversalCommand } from ${JSON.stringify(path.join(pkgDir, 'dist/index.js'))};
      const mk = (method) => new UniversalCommand({
        name: 'esm-probe', description: 'probe',
        input: { parameters: [] }, output: { type: 'json' },
        api: { method }, handler: async () => ({ ok: true }),
      }).toNextAPI();
      const req = (method) => ({
        method, headers: new Headers(), nextUrl: new URL('http://localhost/x'),
        json: async () => ({}),
      });
      const out = {};
      for (const m of ['GET', 'POST']) {
        const res = await mk(m)[m](req(m));
        out[m] = { status: res.status, body: await res.json() };
      }
      console.log(JSON.stringify(out));
    `;
    const stdout = execFileSync(process.execPath, ['--input-type=module', '-e', script], {
      cwd: pkgDir,
      encoding: 'utf8',
    });
    const out = JSON.parse(stdout.trim().split('\n').pop()!);
    expect(out.GET).toEqual({ status: 200, body: { ok: true } });
    expect(out.POST).toEqual({ status: 200, body: { ok: true } });
  }, 60_000);
});
