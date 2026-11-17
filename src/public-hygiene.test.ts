/**
 * Public repo hygiene: this repository is published openly, so its tracked
 * files must carry no internal paths, names or workflow files, the shipped
 * package must contain only what a consumer needs, and the license and package
 * metadata must name the same owner.
 */
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');

function trackedFiles(): string[] {
  try {
    return execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' })
      .split('\n')
      .filter(Boolean);
  } catch {
    // Not a git checkout: walk the tree.
    const out: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (['node_modules', '.git', 'dist', 'coverage'].includes(entry.name)) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else out.push(path.relative(root, full));
      }
    };
    walk(root);
    return out;
  }
}

// Patterns are assembled from pieces so this file does not match itself.
const FORBIDDEN = [
  ['/Us', 'ers/'].join(''),
  ['supernal-code', '-package'].join(''),
  ['supernal', '/docs'].join(''),
  ['~/.cla', 'ude'].join(''),
  ['TAS', 'K-'].join(''),
  ['Magn', 'olia'].join(''),
  ['Ro', 'che'].join(''),
  ['Genen', 'tech'].join(''),
  ['supernalintelligence', '/supernal-coding'].join(''),
];

const SELF = 'src/public-hygiene.test.ts';
const TEXT_EXT = /\.(ts|js|cjs|mjs|json|md|yaml|yml|txt|sh)$|LICENSE$|\.mailmap$|^\.husky\/[^/]+$/;

const files = trackedFiles();

describe('public hygiene', () => {
  it('tracks no internal workflow directories, planning docs or task records', () => {
    const internal = files.filter(
      (f) =>
        f.startsWith('.claude/') ||
        f.startsWith('.supernal/tasks/') ||
        f.startsWith('docs/planning/') ||
        f.startsWith('src/commands/') ||
        f === 'USE_SUPERNAL_CODING.md' ||
        f === 'scripts/benchmark-lazy-loading.js' ||
        /\.code-workspace$/.test(f)
    );
    expect(internal).toEqual([]);
  });

  it('keeps only the public architecture docs under docs/', () => {
    const docs = files.filter((f) => f.startsWith('docs/')).sort();
    expect(docs).toEqual([
      'docs/APPROACH-COMPARISON.md',
      'docs/ARCHITECTURE-ROOMS.md',
      'docs/ARCHITECTURE-STATE-SCOPING.md',
      'docs/SCOPE-BASED-MCP.md',
    ]);
  });

  it('carries no internal path, name or task id in any tracked text file', () => {
    const hits: string[] = [];
    for (const f of files) {
      if (f === SELF || !TEXT_EXT.test(f)) continue;
      const full = path.join(root, f);
      if (!fs.existsSync(full)) continue;
      const text = fs.readFileSync(full, 'utf8');
      for (const pattern of FORBIDDEN) {
        if (text.includes(pattern)) hits.push(`${f}: ${pattern}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it('ships only dist, README.md and LICENSE', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    expect(pkg.files).toEqual(['dist', 'README.md', 'LICENSE']);
  });

  it('names the same owner in LICENSE and package.json', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    const license = fs.readFileSync(path.join(root, 'LICENSE'), 'utf8');
    expect(pkg.license).toBe('MIT');
    expect(license).toMatch(/^MIT License/);
    expect(license).toMatch(/Copyright \(c\) \d{4} Supernal Intelligence/);
    expect(pkg.author).toMatch(/^Supernal Intelligence/);
  });

  it('only installs the Supernal git hooks when the Supernal CLI is present', () => {
    // The hooks call `sc` and block local main/master branches. A contributor
    // without `sc` must not get them through `prepare`.
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    expect(pkg.scripts.prepare).toContain('command -v sc');
  });

  it('declares the Node range that the dependencies and CI actually need', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    expect(pkg.engines.node).toBe('>=20.0.0');
    const ci = fs.readFileSync(path.join(root, '.github/workflows/ci.yml'), 'utf8');
    expect(ci).not.toMatch(/node-version:\s*\[[^\]]*\b18\b/);
  });

  it('points every relative README link at a file that exists', () => {
    for (const doc of ['README.md', 'CONTRIBUTING.md']) {
      const text = fs.readFileSync(path.join(root, doc), 'utf8');
      const links = [...text.matchAll(/\]\((?!https?:|#|mailto:)([^)\s#]+)/g)].map((m) => m[1]);
      const missing = links.filter((l) => !fs.existsSync(path.join(root, l)));
      expect(missing, doc).toEqual([]);
    }
  });
});
