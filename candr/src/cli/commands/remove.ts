import fs from 'node:fs/promises';

import { createPluginCommand } from '../../command/create-plugin-command.js';
import { type SpawnOptions } from '../../spawn/spawn-options.js';
import { type DEPENDENCY_TYPES } from '../../util/dependency-types.js';

const SPAWN_OPTIONS = {
  stdin: 'inherit',
  stdout: 'inherit',
  failureSetExit: true,
  nonZeroResolve: true,
} as const satisfies SpawnOptions;

export default createPluginCommand(({ createCommand, createOption, getProject, getGlobalOptions }) => {
  return createCommand('remove')
    .aliases(['r', 'rm', 'unlink'])
    .description('Remove dependencies from project packages, or uninstall a global package.')
    .argument('<dependencies...>', 'dependencies to remove')
    .addOption(createOption('--prod', 'remove from dependencies').conflicts(['global']))
    .addOption(createOption('--peer', 'remove from peerDependencies').conflicts(['global']))
    .addOption(createOption('--optional', 'remove from optionalDependencies').conflicts(['global']))
    .addOption(createOption('--dev', 'remove from devDependencies').conflicts(['global']))
    .addOption(createOption('--global', 'remove globally (always uses npm)').conflicts(['prod', 'dev', 'peer', 'optional']))
    .action(async (dependencies, {
      dev = false,
      peer = false,
      optional = false,
      prod = false,
      global,
    }) => {
      const [project, globalOptions] = await Promise.all([getProject(), getGlobalOptions()]);

      if (!dev && !peer && !optional && !prod) {
        // If no types are selected, default to all types selected.
        dev = peer = optional = prod = true;
      }

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
          ['remove', '--global', ...dependencies],
          { ...SPAWN_OPTIONS, stdin: 'ignore', stdout: 'pipe', nonZeroPrint: true },
        );

        if (ok) {
          dependencies.forEach((dependency) => {
            project.root.log.info(`removed "${dependency}" globally`);
          });
        }

        return;
      }

      const pm = project.packageManager.replace(/@.*$/u, '');

      const types = [
        ...(dev ? ['devDependencies'] as const : []),
        ...(peer ? ['peerDependencies'] as const : []),
        ...(optional ? ['optionalDependencies'] as const : []),
        ...(prod ? ['dependencies'] as const : []),
      ] satisfies typeof DEPENDENCY_TYPES[number][];

      let install = false;

      await project.packages.forEachParallel(async (pkg) => {
        if (!pkg.isSelected) return;

        const newConfig = JSON.parse(JSON.stringify(pkg.config));

        let updated = false;

        for (const type of types) {
          // Ignore invalid package dependency fields.
          if (newConfig[type] != null && typeof newConfig[type] !== 'object') continue;

          if (newConfig[type]) {
            dependencies.forEach((key) => {
              if (key in newConfig[type]) {
                delete newConfig[type][key];
                updated = true;
                pkg.log.info(`removing "${key}" from ${type.replace(/D/u, ' d')}`);
              }
            });

            if (!Object.keys(newConfig[type]).length) {
              delete newConfig[type];
            }
          }
        }

        if (!updated) return;

        try {
          await fs.writeFile(`${pkg.dir}/package.json`, JSON.stringify(newConfig, null, 2) + '\n');
          install = true;
        }
        catch (error) {
          pkg.log.error('failed to update package.json file');
          pkg.log.error(String(error));
        }
      });

      if (install) {
        // Run install at the root of the project to apply all package changes.
        await project.root.spawn(pm, ['install'], SPAWN_OPTIONS);
      }
    });
});
