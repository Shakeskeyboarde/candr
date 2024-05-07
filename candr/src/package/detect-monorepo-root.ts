import fs from 'node:fs/promises';
import path from 'node:path';

import { type Package } from './package.js';

export const detectMonorepoRoot = async (
  dir: string,
  config: Record<string, unknown>,
  packageManager: Package['packageManager'],
): Promise<boolean> => {
  switch (packageManager) {
    case 'npm':
    case 'yarn':
    case 'yarn@^1':
      return Boolean(config.workspaces);
    case 'pnpm':
      return await fs.access(path.resolve(dir, 'pnpm-workspace.yaml')).then(() => true, () => false);
    default:
      return false;
  }
};
