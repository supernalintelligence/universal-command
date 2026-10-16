import { nodeRequire } from './nodeRequire';

type NextServerLoader = (id: string) => any;

const NEXT_SERVER = 'next/server';

// Dynamic import with a variable specifier: webpack/Turbopack/Vite do not try to
// resolve it at build time, so consumers bundling the dist without `next` installed still build.
// Native Node ESM import does not append `.js` to a package subpath, hence `next/server.js`.
const importHidden: NextServerLoader = (id) =>
  import(/* webpackIgnore: true */ /* turbopackIgnore: true */ /* @vite-ignore */ `${id}.js`);

/**
 * Resolve NextResponse at request time, or undefined when next/server is unavailable.
 * Order: bundler-invisible require (works in CJS and ESM dists and in Jest), then a
 * bundler-hidden dynamic import. A bare require() or a literal import('next/server')
 * is not usable: the first throws in the ESM dist, the second is visible to bundlers.
 */
export function loadNextResponse(
  requireFn?: NextServerLoader,
  importFn?: NextServerLoader
): Promise<any | undefined> {
  // Default loaders share one cached result (including undefined), so a missing `next`
  // is not re-resolved on every request. Injected loaders (tests) bypass the cache.
  if (requireFn || importFn)
    return resolveNextResponse(requireFn ?? nodeRequire, importFn ?? importHidden);
  return (cached ??= resolveNextResponse(nodeRequire, importHidden));
}

let cached: Promise<any | undefined> | undefined;

async function resolveNextResponse(
  requireFn: NextServerLoader,
  importFn: NextServerLoader
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
