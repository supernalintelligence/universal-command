/**
 * Browser-safe, bundler-invisible require for lazy CLI-path dependency loading
 * (commander, readline). Every prior approach broke a consumer:
 *
 *  - A top-level `import { createRequire } from 'node:module'` gets hoisted by
 *    tsup/esbuild into a static `import 'module'` in the ESM dist, which the
 *    dashboard CLIENT bundle cannot resolve (recurring regression — see
 *    da7add6 / PR #312).
 *  - A bare `require(...)` is rewritten by esbuild's ESM output to a THROWING
 *    `__require` stub (it also rewrites the `typeof require` guard to
 *    `typeof __require`, defeating it), so pure-ESM Node consumers (the
 *    repotype CLI bin) died with "commander package is required" even though
 *    commander was installed — failing the pre-push board-structure gate for
 *    every board-touching push.
 *
 * The primary path is `process.getBuiltinModule` (Node >= 20.16): a plain
 * guarded RUNTIME global access that no bundler rewrites, hoists, or tries to
 * resolve, and that works identically from CJS and ESM. The bare-require
 * fallback covers older Node CJS consumers. In a browser neither branch exists
 * and it throws — correct, since these are CLI-only code paths.
 */
export function nodeRequire(id: string): any {
  const getBuiltin = (
    globalThis as {
      process?: {
        getBuiltinModule?: (name: string) => {
          createRequire: (base: string) => (id: string) => any;
        };
      };
    }
  ).process?.getBuiltinModule;
  if (getBuiltin) {
    const base = typeof __filename !== 'undefined' ? __filename : import.meta.url;
    return getBuiltin('node:module').createRequire(base)(id);
  }
  // Older Node in CJS mode: fall back to the real require. (In esbuild's ESM
  // output this branch compiles to the throwing __require stub, but it is
  // unreachable there — getBuiltinModule exists on every Node that runs the
  // ESM dist we ship.)
  if (typeof require !== 'undefined') {
    return require(id);
  }
  throw new Error(`Cannot load module "${id}" in this environment (no require available)`);
}
