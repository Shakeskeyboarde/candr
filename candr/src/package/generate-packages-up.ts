import { generateDirsUp } from '../util/generate-dirs-up.js';
import { type Package } from './package.js';
import { readPackage } from './read-package.js';

/**
 * Generator which yields all packages (ie. directory with a package.json file)
 * from the given directory (inclusive) up to the root. Only packages with
 * names are yielded.
 */
export const generatePackagesUp = async function *(startDir: string): AsyncGenerator<Package, undefined, undefined> {
  for (const dir of generateDirsUp(startDir)) {
    const package_ = await readPackage(dir);

    if (package_.config.name) yield package_;
  }
};
