import { type Command, type OptionValues } from '@commander-js/extra-typings';

import { createPluginCommand } from '../command/create-plugin-command.js';
import { type PluginCommandInitOptions } from '../command/plugin-command-init-options.js';
import { type Package } from '../package/package.js';
import { getNestedDict } from '../util/get-nested-dict.js';
import { isString } from '../util/is-string.js';

/**
 * Add commands for running root package scripts, as long as the script name
 * does not conflict with a previous command. Also runs pre and post lifecycle
 * scripts. Does not use a package manager.
 */
export const getScriptCommands = async (
  { nearestPackage, ...options }: PluginCommandInitOptions & { nearestPackage: Package },
): Promise<Command<any[], OptionValues>[]> => {
  const scripts = getNestedDict(nearestPackage.config, ['scripts'], isString) ?? {};

  const commands = Object.keys(scripts)
    .map((name) => {
      return createPluginCommand(({ createCommand, getProject }) => {
        return createCommand(name)
          .description(`Run the "${name}" script from the current package (${nearestPackage.config.name}).`)
          .allowUnknownOption()
          .argument('[args...]')
          .action(async (scriptArgs) => {
            const run = async (prefix: string = ''): Promise<boolean> => {
              const scriptName = `${prefix}${name}`;
              const script = scriptName in scripts && (scripts[scriptName] ?? false);

              if (!script) return true;

              const project = await getProject();
              const { ok } = await project.root.spawn(script, scriptArgs, {
                cwd: nearestPackage.dir,
                stdin: 'inherit',
                stdout: 'inherit',
                shell: true,
                nonZeroResolve: true,
                failureSetExit: true,
              });

              return ok;
            };

            if (!name.startsWith('pre') && !await run('pre')) return;
            if (!await run()) return;
            if (!name.startsWith('post') && !await run('post')) return;
          });
      }).init(options);
    });

  return commands;
};
