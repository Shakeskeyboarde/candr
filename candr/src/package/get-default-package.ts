import { type Package } from './package.js';

export const getDefaultPackage = (dir: string): Package => {
  return { dir, packageManager: 'npm', isMonorepoRoot: false, isVirtual: true, config: { name: '' } };
};
