import fs from 'node:fs/promises';
import path from 'node:path';

import { type Package } from './package.js';

export const detectPackageManager = async (
  dir: string,
  config: Record<string, unknown>,
): Promise<Package['packageManager']> => {
  // Corepack detection.
  if (typeof config.packageManager === 'string') {
    const [prefix = '', spec = ''] = config.packageManager.split('@', 2);

    switch (prefix) {
      case 'pnpm':
        return prefix;
      case 'yarn':
        return spec.startsWith('1.') ? 'yarn@^1' : 'yarn';
      default:
        // If corepack is configured/used, then no other fallback detection
        // methods are allowed.
        return prefix;
    }
  }

  // Fallback: Lock file detection.
  if (await fs.access(path.resolve(dir, 'pnpm-lock.yaml')).then(() => true, () => false)) return 'pnpm';
  if (await fs.access(path.resolve(dir, 'yarn.lock')).then(() => true, () => false)) {
    return await fs.readFile(path.resolve(dir, 'yarn.lock'), 'utf8').then((text) => {
      return text.includes('# yarn lockfile v1')
        ? 'yarn@^1'
        : 'yarn';
    });
  }
  if (await fs.access(path.resolve(dir, 'package-lock.json')).then(() => true, () => false)) return 'npm';

  // Fallback: PNPM alternative detection.
  if (await fs.access(path.resolve(dir, 'pnpm-workspace.yaml')).then(() => true, () => false)) return 'pnpm';

  // Fallback: Yarn alternative detection.
  if (await fs.access(path.resolve(dir, '.yarnrc')).then(() => true, () => false)) return 'yarn@^1';
  if (await fs.access(path.resolve(dir, '.yarnrc.yml')).then(() => true, () => false)) return 'yarn';
  if (await fs.access(path.resolve(dir, '.yarn')).then(() => true, () => false)) return 'yarn';
  if (await fs.access(path.resolve(dir, '.pnp.cjs')).then(() => true, () => false)) return 'yarn';
  if (await fs.access(path.resolve(dir, '.pnp.loader.mjs')).then(() => true, () => false)) return 'yarn';
  if (typeof config?.workspaces === 'object' && config.workspaces) return 'yarn@^1';

  return 'npm';
};
