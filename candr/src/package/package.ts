import { type PackageConfig } from './package-config.js';

type UnsupportedPackageManager = string & {};

/**
 * Information about a package, which is a directory that contains a
 * `package.json` file with a `name` field.
 */
export interface Package {
  /**
   * The absolute path to the package directory.
   */
  readonly dir: string;

  /**
   * The package manager used to install dependencies.
   */
  readonly packageManager: 'npm' | 'pnpm' | 'yarn' | 'yarn@^1' | UnsupportedPackageManager;

  /**
   * True if the package is the root of a monorepo (aka: workspaces root).
   */
  readonly isMonorepoRoot: boolean;

  /**
   * True if no `package.json` file exists in the directory.
   */
  readonly isVirtual: boolean;

  /**
   * The parsed contents of the package.json file.
   */
  readonly config: PackageConfig;
}
