import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { generatePackagesUp } from '../package/generate-packages-up.js';
import { type Package } from '../package/package.js';
import { DEPENDENCY_TYPES } from '../util/dependency-types.js';
import { getNestedDict } from '../util/get-nested-dict.js';
import { isString } from '../util/is-string.js';
import { type LoadPluginError } from './load-plugin-error.js';
import { type LoadPluginSuccess } from './load-plugin-success.js';

export class Loader {
  readonly #cache = new Map<string, Promise<{ load: (id: string) => Promise<Record<string, unknown>> }>>();

  /**
   * Load (ie: dynamic import) a module relative to a directory.
   *
   * XXX: Create's a temporary resolver script in then `${dir}/node_modules`
   * directory which can be used to do relative import resolution. This should be
   * cleaned up when the process exits.
   */
  readonly load = async (dir: string, id: string): Promise<any> => {
    dir = path.resolve(dir);

    let promise = this.#cache.get(dir);

    if (!promise) {
      promise = this.#initLoader(dir);
      this.#cache.set(dir, promise);
    }

    // If the id is relative, make it relative to the rootDir, not the temporary
    // script file.
    const loader = await promise;
    const normalizedId = /^.{1,2}\//u.test(id) ? `../${id}` : id;
    const exports = await loader.load(normalizedId);

    return exports;
  };

  /**
   * Plugins are just packages with pre-defined name patterns. This method will
   * find dependencies that match the `pattern` in all project packages,
   * starting at `startDirOrPackage`. Load module failures are collected and
   * returned as the second value in the result tuple.
   */
  readonly loadPlugins = async (
    startDirOrPackage: string | Package,
    pattern: RegExp,
  ): Promise<(LoadPluginSuccess | LoadPluginError)[]> => {
    const ids = new Set<string>();
    const [dir, packages] = typeof startDirOrPackage === 'string'
      ? [startDirOrPackage, generatePackagesUp(startDirOrPackage)]
      : [startDirOrPackage.dir, (async function *() {
        yield startDirOrPackage;
        yield* generatePackagesUp(path.dirname(startDirOrPackage.dir));
      })()];

    for await (const package_ of packages) {
      Array.from(new Set(DEPENDENCY_TYPES
        .map((type) => getNestedDict(package_.config, [type], isString))
        .flatMap((value) => value ? Object.keys(value) : [])
        .filter((name) => pattern.test(name))))
        .forEach((name) => ids.add(name));

      if (package_.isMonorepoRoot) break;
    }

    const idArray = Array.from(ids);
    const settled = await Promise.allSettled(idArray.map((id) => this.load(dir, id)));
    const results: (LoadPluginSuccess | LoadPluginError)[] = settled.map((result, i) => {
      const id = idArray[i]!;

      return result.status === 'fulfilled'
        ? { id, exports: result.value }
        : { id, reason: result.reason };
    });

    return results;
  };

  #initLoader = async (dir: string): Promise<{ load: (id: string) => Promise<any> }> => {
    const tempFilename = path.join(dir, `/node_modules/.candr-loader-${crypto.randomUUID()}.mjs`);
    const tempDir = await fs.mkdir(path.dirname(tempFilename), { recursive: true });

    try {
      await fs.writeFile(tempFilename, 'export const load = (id) => import(id);');
      return await import(tempFilename);
    }
    finally {
      // Delete the temporary script (and directory if still empty) immediately
      // after importing. It's no longer necessary once it's been imported.
      await fs.rm(tempFilename, { force: true }).catch(() => { /* non-fatal */ });
      if (tempDir) await fs.rmdir(tempDir).catch(() => { /* non-fatal */ });
    }
  };

  static #singleton = new Loader();

  static load: Loader['load'] = (rootDir, id) => {
    return Loader.#singleton.load(rootDir, id);
  };

  static loadPlugins: Loader['loadPlugins'] = (start, idPattern) => {
    return Loader.#singleton.loadPlugins(start, idPattern);
  };
}
