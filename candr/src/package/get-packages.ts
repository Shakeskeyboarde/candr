import { generatePackagesUp } from './generate-packages-up.js';
import { getDefaultPackage } from './get-default-package.js';
import { type Package } from './package.js';

/**
 * Find all packages up to the project root. If no real package is found, then
 * an empty and unnamed package at the given directory is returned, so that at
 * least one package is always returned.
 */
export const getPackages = async function (dir: string): Promise<[Package, ...Package[]]> {
  const packages: Package[] = [];

  for await (const package_ of generatePackagesUp(dir)) {
    packages.push(package_);
    if (package_.isMonorepoRoot) break;
  }

  return packages.length ? packages as [Package, ...Package[]] : [getDefaultPackage(dir)];
};
