import { createPluginCommand, type ProjectPackage } from 'candr';

export default createPluginCommand(({ createCommand, getGlobalOptions, getProject }) => {
  return createCommand('run')
    .description('Run project package scripts.')
    .argument('<script>', 'script name to run')
    .argument('[args...]', 'arguments to pass to the script')
    .allowUnknownOption()
    .action(async (scriptName, args) => {
      const [globalOptions, project] = await Promise.all([getGlobalOptions(), getProject()]);
      const { filter } = globalOptions;
      const { packages } = project;

      if (!filter.length && packages.start !== packages.root) {
        packages.array.forEach((package_) => package_.isSelected = package_ === packages.start);
      }

      await packages.forEach(async (pkg, abort) => {
        if (!pkg.isSelected) return;

        if (!scriptName.startsWith('pre') && !await run(pkg, `pre${scriptName}`, args)) {
          abort();
          return;
        }

        if (!await run(pkg, scriptName, args)) {
          abort();
          return;
        }

        if (!scriptName.startsWith('post') && !await run(pkg, `post${scriptName}`, args)) {
          abort();
          return;
        }
      });
    });
});

const run = async (package_: ProjectPackage, name: string, args: string[] = []): Promise<boolean> => {
  const scripts = package_.getConfigDict(['scripts'], (value): value is string => typeof value === 'string');

  if (!scripts) return true;

  const script = name in scripts && (scripts[name] ?? false);

  if (!script) return true;

  const { ok } = await package_.spawn(script, args, {
    cwd: package_.dir,
    stdout: package_.log,
    shell: true,
    nonZeroResolve: true,
    failureSetExit: true,
  });

  return ok;
};
