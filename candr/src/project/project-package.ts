import { type Logger } from '../logger/logger.js';
import { type Package } from '../package/package.js';
import { type PackageConfig } from '../package/package-config.js';
import { spawn } from '../spawn/spawn.js';
import { getNestedDict } from '../util/get-nested-dict.js';
import { getNestedValue } from '../util/get-nested-value.js';
import { type Project } from './project.js';
import { type ProjectPackageLink } from './project-package-link.js';

type UnsupportedPackageManager = string & {};

interface Options {
  readonly log: Logger;
  readonly project: Project;
  readonly package: Pick<Package, 'dir' | 'config' | 'isVirtual'>;
  readonly packageManager: 'npm' | 'pnpm' | 'yarn' | 'yarn@^1' | UnsupportedPackageManager;
  readonly isRoot: boolean;
  readonly isSelected: boolean;
  readonly getLocalDependencies: (self: ProjectPackage) => ProjectPackageLink[];
  readonly getLocalDependents: (self: ProjectPackage) => ProjectPackageLink[];
}

/**
 * Package that is part of a project, with project specific metadata.
 */
export class ProjectPackage {
  /**
   * Log instance.
   */
  readonly log: Logger;

  /**
   * Reference to the project that contains this package.
   */
  readonly project: Project;

  /**
   * The absolute path to the package directory.
   */
  readonly dir: string;

  /**
   * The parsed contents of the package.json file.
   */
  readonly config: PackageConfig;

  /**
   * The package manager used to install dependencies.
   */
  readonly packageManager: 'npm' | 'pnpm' | 'yarn' | 'yarn@^1' | UnsupportedPackageManager;

  /**
   * True if the package is the project root.
   */
  readonly isRoot: boolean;

  /**
   * True if the package is a virtual package (no package.json file).
   */
  readonly isVirtual: boolean;

  /**
   * Mutable flag to indicate if the package is "selected" or not.
   */
  isSelected: boolean;

  constructor({
    log,
    project,
    package: package_,
    packageManager,
    isRoot,
    isSelected,
    getLocalDependencies,
    getLocalDependents,
  }: Options) {
    this.log = log;
    this.project = project;
    this.dir = package_.dir;
    this.config = package_.config;
    this.packageManager = packageManager!;
    this.isRoot = isRoot;
    this.isVirtual = package_.isVirtual;
    this.isSelected = isSelected;
    this.getLocalDependencies = getLocalDependencies.bind(null, this);
    this.getLocalDependents = getLocalDependents.bind(null, this);
  }

  /**
   * Enumerate the local dependencies of this package.
   */
  readonly getLocalDependencies: () => ProjectPackageLink[];

  /**
   * Enumerate the local dependents of this package.
   */
  readonly getLocalDependents: () => ProjectPackageLink[];

  /**
   * Get a field from the package config (package.json).
   */
  readonly getConfig = <T>(
    pathParts: [string | number, ...(string | number)[]],
    predicate?: (value: unknown) => value is T,
  ): T | undefined => {
    return getNestedValue(this.config, pathParts, predicate);
  };

  /**
   * Get a dictionary field from the package config (package.json). Returns
   * undefined if the field is not an object, or if it's an array.
   */
  readonly getConfigDict = <T>(
    pathParts: [string | number, ...(string | number)[]],
    predicate?: (value: unknown) => value is T,
  ): Record<string, T> | undefined => {
    return getNestedDict(this.config, pathParts, predicate);
  };

  /**
   * Spawn a process. Working directory defaults to the package directory.
   */
  readonly spawn: typeof spawn = async (command, args, { stdout, stderr = stdout, env, ...options } = {}) => {
    const selected = this.project.packages.array.filter((package_) => package_.isSelected);

    return await spawn(command, args, {
      cwd: this.dir,
      env: {
        CANDR_SELECTED_DIRS: JSON.stringify(selected?.map((package_) => package_.dir)),
        CANDR_SELECTED_NAMES: JSON.stringify(selected?.map((package_) => package_.config.name)),
        ...env,
      },
      stdout: (stdout === 'inherit' && this.log.tag) ? this.log : stdout,
      stderr: (stderr === 'inherit' && this.log.tag) ? this.log : stderr,
      ...options,
    });
  };
}
