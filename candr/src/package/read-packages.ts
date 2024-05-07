import { type Package } from './package.js';
import { readPackage } from './read-package.js';

/**
 * Load package information for multiple directories, omitting directories that
 * are not really packages. To be a package, a directory must contain a valid
 * `package.json` file with a non-empty `name` field.
 */
export const readPackages = async (dirs: string[]): Promise<Package[]> => {
  const packages = await Promise.all(dirs.map(readPackage));
  const namedPackages = packages.filter((package_) => package_.config.name);

  return namedPackages;
};
