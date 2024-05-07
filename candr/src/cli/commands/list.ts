import chalk from 'chalk';

import { createPluginCommand } from '../../command/create-plugin-command.js';

export default createPluginCommand(({ createCommand, createOption, getProject }) => {
  return createCommand('list')
    .aliases(['ls'])
    .description('List project packages.')
    .addOption(createOption('--json', 'format output as JSON').conflicts('ndjson'))
    .addOption(createOption('--ndjson', 'format output as NDJSON').conflicts('json'))
    .option('--all', 'list all packages regardless of filtering')
    .action(async ({ json, ndjson, all = false }) => {
      const project = await getProject();
      const packages = (
        all
          ? project.packages.array
          : project.packages.array.filter((package_) => package_.isSelected)
      ).map((package_) => ({
        name: package_.config.name,
        version: package_.config.version ?? null,
        private: package_.config.private ?? false,
        isSelected: package_.isSelected,
        dir: package_.dir,
        localDependencies: package_.getLocalDependencies().map((link) => ({
          type: link.type,
          key: link.key,
          value: link.value,
          name: link.package.config.name,
          dir: link.package.dir,
        })),
        localDependents: package_.getLocalDependents().map((link) => ({
          type: link.type,
          key: link.key,
          value: link.value,
          name: link.package.config.name,
          dir: link.package.dir,
        })),
      }));

      if (json)
        console.log(JSON.stringify(packages, null, 2));
      else if (ndjson)
        packages.forEach((package_) => console.log(JSON.stringify(package_)));
      else
        packages.forEach((package_) => console.log(`${package_.name} ${chalk.dim(package_.dir)}`));
    });
});
