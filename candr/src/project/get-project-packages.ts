import { Logger } from '../logger/logger.js';
import { type Package } from '../package/package.js';
import { DEPENDENCY_TYPES } from '../util/dependency-types.js';
import { isString } from '../util/is-string.js';
import { type Project } from './project.js';
import { ProjectPackage } from './project-package.js';
import { type ProjectPackageLink } from './project-package-link.js';

interface Options {
  readonly project: Project;
  readonly root: Pick<Package, 'dir' | 'config' | 'isVirtual'>;
  readonly packages: Pick<Package, 'dir' | 'config' | 'isVirtual'>[];
  readonly packageManager: Package['packageManager'];
}

/**
 * Get packages enhanced with project specific information and utility methods
 * like local dependencies and dependents.
 */
export const getProjectPackages = (options: Options): [root: ProjectPackage, packages: ProjectPackage[]] => {
  const dependentToDependenciesLinks = new Map<ProjectPackage, ProjectPackageLink[]>();
  const dependencyToDependentsLinks = new Map<ProjectPackage, ProjectPackageLink[]>();

  const getLocalDependencies = (dependent: ProjectPackage): ProjectPackageLink[] => {
    return Array.from(dependentToDependenciesLinks.get(dependent) ?? []);
  };

  const getLocalDependents = (dependency: ProjectPackage): ProjectPackageLink[] => {
    return Array.from(dependencyToDependentsLinks.get(dependency) ?? []);
  };

  const root = new ProjectPackage({
    log: new Logger(),
    project: options.project,
    package: options.root,
    packageManager: options.packageManager,
    isRoot: true,
    // Select the root by default if there are no other packages.
    isSelected: options.packages.length === 0,
    getLocalDependencies,
    getLocalDependents,
  });

  const tags = new Set<string>();
  const unsorted = [
    ...options.packages.map((package_) => {
      const shortTag = package_.config.name.replace(/^@[^/]+\//u, '');
      const tag = tags.has(shortTag) ? package_.config.name : shortTag;

      tags.add(tag);

      return new ProjectPackage({
        log: new Logger({ tag }),
        project: options.project,
        package: package_,
        packageManager: options.packageManager,
        isRoot: false,
        isSelected: true,
        getLocalDependencies,
        getLocalDependents,
      });
    }),
    root,
  ];

  unsorted
    .flatMap((dependent) => DEPENDENCY_TYPES.map((type) => ({ dependent, type })))
    .map(({ dependent, type }) => ({ dependent, type, deps: dependent.getConfigDict([type], isString) ?? {} }))
    .flatMap(({ deps, ...rest }) => Object.entries(deps).map(([key, value]) => ({ ...rest, key, value })))
    .filter((entry): entry is typeof entry & { value: string } => typeof entry.value === 'string')
    .map(({ key, value, ...rest }) => {
      // Get the actual ID of the dependency, accounting for npm (ie.
      // `npm:<name>@...`) and workspace (ie. `workspace:<name>@...`) protocol
      // aliases.

      const aliasMatch = value.match(/^(?:npm|workspace):((?:@[^@\s/]+\/)?[a-z_.][^@\s]*)/imu);
      const id = aliasMatch ? aliasMatch[1]! : key;

      return { ...rest, key, value, id };
    })
    .flatMap(({ id, ...rest }) => unsorted
      .filter((dependency) => dependency.config.name === id)
      .map((dependency) => ({ ...rest, dependency })))
    .forEach(({ dependent, type, key, value, dependency }) => {
      const dependencyLinks = dependentToDependenciesLinks.get(dependent);
      const dependentLinks = dependencyToDependentsLinks.get(dependency);

      if (dependencyLinks)
        dependencyLinks.push({ type, key, value, package: dependency });
      else
        dependentToDependenciesLinks.set(dependent, [{ type, key, value, package: dependency }]);

      if (dependentLinks)
        dependentLinks.push({ type, key, value, package: dependent });
      else
        dependencyToDependentsLinks.set(dependency, [{ type, key, value, package: dependent }]);
    });

  const sorted = Array.from((function *() {
    const visited = new Set<ProjectPackage>();

    const visit = function *(
      current: ProjectPackage,
    ): Generator<ProjectPackage, undefined, undefined> {
      if (visited.has(current)) return;

      visited.add(current);

      for (const dependency of current.getLocalDependencies()) {
        yield* visit(dependency.package);
      }

      yield current;
    };

    for (const current of unsorted) {
      yield* visit(current);
    }
  })());

  return [root, sorted];
};
