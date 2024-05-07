import os from 'node:os';
import path from 'node:path';

import { Sema } from 'async-sema';
import micromatch from 'micromatch';

import { type Package } from '../package/package.js';
import { AsyncThrottle } from '../util/async-throttle.js';
import { defer } from '../util/defer.js';
import { getProjectPackages } from './get-project-packages.js';
import { type Project } from './project.js';
import { type ProjectPackage } from './project-package.js';

interface Options {
  readonly project: Project;
  readonly root: Pick<Package, 'dir' | 'config' | 'isVirtual'>;
  readonly packages: Pick<Package, 'dir' | 'config' | 'isVirtual'>[];
  readonly packageManager: Package['packageManager'];
}

/**
 * Project package access and async iteration in dependency order.
 */
export class ProjectPackageCollection implements Iterable<ProjectPackage> {
  #throttle = new AsyncThrottle();
  #concurrency: number | 'auto' = 'auto';

  /**
   * The project root package.
   */
  readonly root: ProjectPackage;

  /**
   * The package where Candr was started.
   */
  readonly start: ProjectPackage;

  /**
   * All packages in a project, including the project root package.
   */
  readonly array: readonly ProjectPackage[];

  get size(): number {
    return this.array.length;
  }

  get delayMs(): number {
    return this.#throttle.delayMs;
  }

  set delayMs(value: number) {
    this.#throttle.delayMs = value;
  }

  get concurrency(): number | 'auto' {
    return this.#concurrency;
  }

  set concurrency(value: number | 'auto') {
    this.#concurrency = value === 'auto' ? 'auto' : Math.min(100, Math.max(1, Math.trunc(value || 0)));
  }

  parallel: boolean | 'stream' = false;

  constructor(options: Options) {
    ([this.root, this.array] = getProjectPackages(options));
    this.start = this.getFilePackage(process.env.INIT_CWD ?? process.cwd()) ?? this.root;
  }

  /**
   * Iterate over packages in dependency order.
   */
  [Symbol.iterator](): Iterator<ProjectPackage, undefined, undefined> {
    return this.array[Symbol.iterator]();
  }

  /**
   * Execute all callbacks simultaneously, without blocking on dependencies.
   */
  readonly forEachParallel = async (
    callback: (context: ProjectPackage, abort: () => void) => Promise<void>,
    signal?: AbortSignal,
  ): Promise<boolean> => {
    const promises: Promise<void>[] = [];
    const controller = new AbortController();

    signal?.addEventListener('abort', () => controller.abort());

    for (const context of this.array) {
      promises.push(this.#throttle.promise().then(async () => {
        if (controller.signal.aborted) return;
        await callback(context, () => controller.abort()).finally(() => context.log.flush());
      }));
    }

    await Promise.all(promises);

    return !controller.signal.aborted;
  };

  /**
   * Execute callbacks in dependency order, parallelizing callbacks for
   * packages that are not interdependent.
   */
  readonly forEachStreaming = async (
    callback: (context: ProjectPackage, abort: () => void) => Promise<void>,
    signal?: AbortSignal,
  ): Promise<boolean> => {
    const semaphore = new Sema(this.#concurrency === 'auto' ? os.cpus().length + 1 : this.#concurrency);
    const promises = new Map<ProjectPackage, Promise<void>>();
    const controller = new AbortController();
    const resolvers: (() => void)[] = [];

    signal?.addEventListener('abort', () => controller.abort());

    // Generate un-started tasks for each package.
    for (const context of this.array) {
      const [task, resolve] = defer(async () => {
        if (controller.signal.aborted) return;

        const dependencies = context.getLocalDependencies();
        const dependenciesPromises = dependencies.map((dependency) => promises.get(dependency.package)!);

        try {
          await Promise.all(dependenciesPromises);
        }
        catch {
          // Abort if a dependency callback rejects. All promises are awaited
          // below, so it's unnecessary to handle the error/rejection here
          return;
        }

        if (controller.signal.aborted) return;
        await semaphore.acquire();

        try {
          if (controller.signal.aborted) return;
          await this.#throttle.promise();
          if (controller.signal.aborted) return;
          await callback(context, () => controller.abort()).finally(() => context.log.flush());
        }
        finally {
          semaphore.release();
        }
      });

      promises.set(context, task());
      resolvers.push(resolve);
    }

    // Start all the tasks.
    resolvers.forEach((resolve) => resolve());

    // Await all the task promises.
    await Promise.all(promises.values());

    return !controller.signal.aborted;
  };

  /**
   * Execute callbacks in dependency order, one at a time (serial,
   * non-parallel).
   */
  readonly forEachSequential = async (
    callback: (context: ProjectPackage, abort: () => void) => Promise<void>,
    signal?: AbortSignal,
  ): Promise<boolean> => {
    const controller = new AbortController();

    signal?.addEventListener('abort', () => controller.abort());

    for (const context of this.array) {
      if (controller.signal.aborted) break;
      await this.#throttle.promise();
      if (controller.signal.aborted) break;
      await callback(context, () => controller.abort()).finally(() => context.log.flush());
    }

    return !controller.signal.aborted;
  };

  /**
   * Execute callbacks according to the {@link parallel} setting.
   *
   * - `true`: Equivalent to {@link forEachParallel}.
   * - `'stream'`: Equivalent to {@link forEachStreaming}.
   * - `false`: Equivalent to {@link forEachSequential}.
   */
  readonly forEach = (
    callback: (context: ProjectPackage, abort: () => void) => Promise<void>,
    signal?: AbortSignal,
  ): Promise<boolean> => {
    switch (this.parallel) {
      case true:
        return this.forEachParallel(callback, signal);
      case 'stream':
        return this.forEachStreaming(callback, signal);
      case false:
        return this.forEachSequential(callback, signal);
    }
  };

  /**
   * Select or deselect packages by names or glob patterns.
   *
   * Examples:
   * - Include:
   *   - `"foo"` selects package named `foo`.
   *   - `"foo*"` selects packages with names starting with `foo`.
   *   - `"foo..."` selects `foo` and packages that `foo` depends on.
   *   - `"foo^..."` selects packages that `foo` depends on, but not `foo`.
   *   - `"...foo"` selects `foo` and packages that depend on `foo`.
   *   - `"...^foo"` selects packages that depend on `foo`, but not `foo`.
   * - Exclude (prefixed with `!`):
   *   - `"!foo"` deselects package named `foo`.
   *   - `"!foo*"` deselects packages with names starting with `foo`.
   *   - `"!foo..."` deselects `foo` and packages that `foo` depends on.
   *   - `"!foo^..."` deselects packages that `foo` depends on, but not `foo`.
   *   - `"!...foo"` deselects `foo` and packages that depend on `foo`.
   *   - `"!...^foo"` deselects packages that depend on `foo`, but not `foo`.
   */
  readonly filter = (...filters: string[]): void => {
    const names = this.array.map((package_) => package_.config.name);

    for (const filter of filters) {
      const match = filter.match(/^(!)?(?:(\.{3})(\^)?)?(.*?)(?:(\^)?(\.{3}))?$/u);

      if (!match) continue;

      const [, negate, dependents, exclusiveDependents, pattern = '', exclusiveDependencies, dependencies] = match;
      const exclusive = Boolean(
        dependents && dependencies
          ? exclusiveDependents && exclusiveDependencies
          : exclusiveDependents || exclusiveDependencies,
      );

      // Ignore blank patterns.
      if (!pattern) continue;

      micromatch(names, pattern)
        .flatMap((name) => this.array.filter((pkg) => pkg.config.name === name))
        .forEach((value) => ((pkg) => {
          if (!exclusive) pkg.isSelected = !negate;

          if (dependencies) {
            const visited = new Set([pkg]);

            pkg.getLocalDependencies().forEach(function eachDependency({ package: dependency }) {
              if (visited.has(dependency)) return;

              visited.add(dependency);
              dependency.isSelected = !negate;
              dependency.getLocalDependencies().forEach(eachDependency);
            });
          }

          if (dependents) {
            const visited = new Set([pkg]);

            pkg.getLocalDependents().forEach(function eachDependent({ package: dependent }) {
              if (visited.has(dependent)) return;

              visited.add(dependent);
              dependent.isSelected = !negate;
              dependent.getLocalDependents().forEach(eachDependent);
            });
          }
        })(value));
    }
  };

  /**
   * Get the package which contains the specified filename (or directory).
   */
  getFilePackage(filename: string): ProjectPackage | undefined {
    let longest: ProjectPackage | undefined;

    for (const package_ of this.array) {
      const rel = path.relative(package_.dir, filename);

      if (rel.startsWith('..')) continue;
      if (longest && rel.length < longest.dir.length) continue;

      longest = package_;
    }

    return longest;
  }
}
