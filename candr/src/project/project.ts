import { type Package } from '../package/package.js';
import { type ProjectPackage } from './project-package.js';
import { ProjectPackageCollection } from './project-package-collection.js';

interface Options {
  readonly root: Pick<Package, 'dir' | 'config' | 'isVirtual'>;
  readonly packages?: Pick<Package, 'dir' | 'config' | 'isVirtual'>[];
  readonly packageManager: Package['packageManager'];
}

/**
 * Project information and package management.
 */
export class Project {
  /**
   * The root package of the project.
   */
  readonly root: ProjectPackage;

  /**
   * All packages that are part of the project, including the
   * {@link root} package.
   */
  readonly packages: ProjectPackageCollection;

  /**
   * The package manager used to install dependencies.
   */
  readonly packageManager: Package['packageManager'];

  constructor({ root, packages = [], packageManager }: Options) {
    this.packages = new ProjectPackageCollection({ project: this, root, packages, packageManager });
    this.root = this.packages.root;
    this.packageManager = packageManager;
  }
}
