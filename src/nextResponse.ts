import { nodeRequire } from './nodeRequire';

type NextServerLoader = (id: string) => any;

const NEXT_SERVER = 'next/server';

// Dynamic import with a variable specifier: webpack/Turbopack/Vite do not try to
// resolve it at build time, so consumers bundling the dist without `next` installed still build.
const importHidden: NextServerLoader = (id) =>
  import(/* webpackIgnore: true */ /* @vite-ignore */ id);

/**
 * Resolve NextResponse at request time, or undefined when next/server is unavailable.
 * Order: bundler-invisible require (works in CJS and ESM dists and in Jest), then a
 * bundler-hidden dynamic import. A bare require() or a literal import('next/server')
 * is not usable: the first throws in the ESM dist, the second is visible to bundlers.
 */
export async function loadNextResponse(
  requireFn: NextServerLoader = nodeRequire,
  importFn: NextServerLoader = importHidden
): Promise<any | undefined> {
  for (const load of [requireFn, importFn]) {
    try {
      const mod = await load(NEXT_SERVER);
      const found = mod?.NextResponse ?? mod?.default?.NextResponse;
      if (found) return found;
    } catch {
      // try the next loader
    }
  }
  return undefined;
}
