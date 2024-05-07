import { createPluginCommand } from 'candr';

export default createPluginCommand(({ createCommand, getGlobalOptions, getProject }) => {
  return createCommand('exec')
    .description('Execute commands in project packages.')
    .argument('<command>', 'command to execute')
    .argument('[args...]', 'arguments to pass to the command')
    .allowUnknownOption()
    .action(async (command, args) => {
      const [globalOptions, project] = await Promise.all([getGlobalOptions(), getProject()]);
      const { filter } = globalOptions;
      const { packages } = project;

      if (!filter.length && packages.start !== packages.root) {
        packages.array.forEach((package_) => package_.isSelected = package_ === packages.start);
      }

      await packages.forEach(async (pkg, abort) => {
        if (!pkg.isSelected) return;

        const { ok } = await pkg.spawn(command, args, {
          cwd: pkg.dir,
          stdout: pkg.log,
          nonZeroResolve: true,
          failureSetExit: true,
        });

        if (!ok) abort();
      });
    });
});
