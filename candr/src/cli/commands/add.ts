import fs from 'node:fs/promises';

import semver from 'semver';

import { createPluginCommand } from '../../command/create-plugin-command.js';
import { type SpawnOptions } from '../../spawn/spawn-options.js';
import { DEPENDENCY_TYPES } from '../../util/dependency-types.js';
import { isString } from '../../util/is-string.js';

const SPAWN_OPTIONS = {
  stdin: 'inherit',
  stdout: 'inherit',
  failureSetExit: true,
  nonZeroResolve: true,
} as const satisfies SpawnOptions;

export default createPluginCommand(({ createCommand, createOption, getProject, getGlobalOptions }) => {
  return createCommand('add')
    .aliases(['a'])
    .description('Add dependencies to project packages, or install a global package.')
    .argument('<dependencies...>', 'dependencies to add')
    .addOption(createOption('--prod', 'add to dependencies (default)').conflicts(['global']))
    .addOption(createOption('--peer', 'add to peerDependencies').conflicts(['global']))
    .addOption(createOption('--optional', 'add to optionalDependencies').conflicts(['global']))
    .addOption(createOption('--dev', 'add to devDependencies').conflicts(['global']))
    .addOption(createOption('--exact', 'use an exact version instead of a caret range').conflicts(['global']))
    .addOption(createOption('--no-install', 'do not run the install command after updating package files').conflicts(['global']))
    .addOption(createOption('--global', 'add globally (always uses npm)').conflicts(['prod', 'dev', 'peer', 'optional', 'exact']))
    .option('--ignore-scripts', 'do not run lifecycle scripts')
    .action(async (dependencies, {
      dev = false,
      peer = false,
      optional = false,
      prod = !dev && !peer && !optional,
      exact = false,
      install = true,
      global,
      ignoreScripts,
    }) => {
      const [project, globalOptions] = await Promise.all([getProject(), getGlobalOptions()]);

      if (!globalOptions.filter.length) {
        // Select the nearest package if no filter is provided, instead of the
        // default behavior of selecting everything except the monorepo root.
        const nearest = project.packages.getFilePackage(process.env.INIT_CWD ?? process.cwd());
        project.packages.array.forEach((pkg) => pkg.isSelected = pkg === nearest);
      }

      // XXX: Always use NPM when working globally. Yarn 2+ doesn't actually
      // support global installs, and there's no real reason to use other
      // package managers for global installs anyway.
      if (global) {
        const { ok } = await project.root.spawn(
          'npm',
          ['install', '--global', { '--ignore-scripts': ignoreScripts }, ...dependencies],
          { ...SPAWN_OPTIONS, stdin: 'ignore', stdout: 'pipe', nonZeroPrint: true },
        );

        if (ok) {
          dependencies.forEach((dependency) => {
            project.root.log.info(`added "${dependency}" globally`);
          });
        }

        return;
      }

      const pm = project.packageManager.replace(/@.*$/u, '');

      const entries = await Promise.all(dependencies.map(async (
        dependency,
      ): Promise<[key: string, value: string]> => {
        const [key, explicitValue] = dependency.split(/(?<!^)@/u, 2) as [string, string?];
        let value = explicitValue;

        // If the dependency is a local package, use a workspace reference,
        // or wildcard if the package manager is NPM.
        if (!value && project.packages.array.some((pkg) => pkg.config.name === key)) {
          const local = project.packages.array.find((pkg) => pkg.config.name === key);

          if (local) {
            if (project.packageManager === 'npm') {
              if (typeof local.config.version === 'string') {
                value = `${exact ? '' : '^'}${local.config.version}`;
              }
            }
            else {
              value = `workspace:${exact ? '*' : '^'}`;
            }
          }
        }

        // Re-use the current semver version range used in the project. Only
        // works if all references are the same valid semver range.
        if (!value) {
          const specs = Array.from(new Set(project.packages.array.flatMap((pkg) => {
            return DEPENDENCY_TYPES
              .map((type) => pkg.getConfigDict([type], isString))
              .flatMap((v) => v ? Object.values(v) : [])
              .flatMap(([k, v]): [] | string => {
                if (typeof v !== 'string') return [];
                const alias = v.match(/^npm:(@?[^@]*)@(.*)$/u);
                const [name, target] = alias ? alias.slice(1) as [string, string] : [k, v];
                if (name !== key) return [];
                return target;
              });
          })));

          if (specs.length === 1 && specs[0] && semver.validRange(specs[0]) && (!exact || semver.valid(specs[0]))) {
            value = specs[0];
          }
        }

        // Get the version from the registry.
        if (!value || !semver.validRange(value) || (exact && !semver.valid(value))) {
          const result = await project.root.spawn(pm, [
            // XXX: Yarn 2+ uses the `yarn npm info` command instead of just
            // `yarn info`.
            { npm: project.packageManager === 'yarn' },
            'info', '--json',
            key,
          ], { failureResolve: true });

          const info: any = result.stdout.json();
          const data = project.packageManager === 'yarn@^1' ? info?.data : info;
          const version: string | undefined = semver.validRange(value)
            // Value is a valid range, so find the highest published version
            // that satisfies it.
            ? data?.versions
              ?.filter((v: string) => semver.satisfies(v, value!))
              .sort(semver.rcompare).at(0)
            // No value or not a valid range, so we're looking for a dist-tag.
            : data?.['dist-tags']?.[value ?? 'latest'];

          if (typeof version === 'string') {
            value = `${exact ? '' : '^'}${version}`;
          }
        }

        if (!value) {
          throw new Error(`failed to determine version for dependency "${key}"`);
        }

        return [key, value];
      }));

      const types = [
        ['devDependencies', dev],
        ['peerDependencies', peer],
        ['optionalDependencies', optional],
        ['dependencies', prod],
      ] satisfies [typeof DEPENDENCY_TYPES[number], boolean][];

      let updatedPackages = false;

      await project.packages.forEachParallel(async (pkg) => {
        if (!pkg.isSelected) return;

        const newConfig = JSON.parse(JSON.stringify(pkg.config));

        let updatedPackage = false;

        for (const [type, enabled] of types) {
          // Ignore invalid package dependency fields.
          if (newConfig[type] != null && typeof newConfig[type] !== 'object') continue;

          if (enabled) {
            newConfig[type] ??= {};

            let updatedDependencyType = false;

            for (const [key, value] of entries) {
              if (newConfig[type][key] === value) continue;

              newConfig[type][key] = value;
              updatedPackage = updatedDependencyType = true;
              pkg.log.info(`adding "${key}@${value}" to ${type}`);
            }

            if (updatedDependencyType) {
              // Sort dependencies alphabetically.
              newConfig[type] = Object.fromEntries(
                Object.entries(newConfig[type])
                  .sort((a, b) => a[0].localeCompare(b[0])),
              );
            }
          }
          else if (newConfig[type]) {
            entries.forEach(([key]) => {
              if (key in newConfig[type]) {
                delete newConfig[type][key];
                updatedPackage = true;
                pkg.log.info(`removing "${key}" from ${type.replace(/D/u, ' d')}`);
              }
            });

            if (!Object.keys(newConfig[type]).length) {
              delete newConfig[type];
            }
          }
        }

        if (!updatedPackage) return;

        try {
          await fs.writeFile(`${pkg.dir}/package.json`, JSON.stringify(newConfig, null, 2) + '\n');
          updatedPackages = true;
        }
        catch (error) {
          pkg.log.error('failed to update package.json file');
          pkg.log.error(String(error));
        }
      });

      if (updatedPackages && install) {
        // Run install at the root of the project to apply all package changes.
        await project.root.spawn(pm, ['install'], SPAWN_OPTIONS);
      }
    });
});
