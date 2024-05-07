import fs from 'node:fs/promises';
import path from 'node:path';

import { isObject } from '../util/is-object.js';
import { tryJson } from '../util/try-json.js';
import { detectMonorepoRoot } from './detect-monorepo-root.js';
import { detectPackageManager } from './detect-package-manager.js';
import { getDefaultPackage } from './get-default-package.js';
import { type Package } from './package.js';

/**
 * Load package information for the directory. If there is no valid
 * `package.json` file, then a default package with an empty name will be
 * returned.
 */
export const readPackage = async (dir: string): Promise<Package> => {
  const text = await fs.readFile(path.join(dir, 'package.json'), 'utf8')
    .catch((error: any) => {
      if (error?.code !== 'ENOENT') throw error;
      return null;
    });

  if (text) {
    try {
      const config = tryJson(text, isObject);

      if (config) {
        const packageManager = await detectPackageManager(dir, config);
        const isMonorepoRoot = await detectMonorepoRoot(dir, config, packageManager);

        return {
          dir,
          packageManager,
          isMonorepoRoot,
          isVirtual: false,
          config: {
            ...config,
            name: typeof config.name === 'string' ? config.name : '',
          },
        };
      }
    }
    catch {
      // Ignore invalid packages.
    }
  }

  return getDefaultPackage(dir);
};
