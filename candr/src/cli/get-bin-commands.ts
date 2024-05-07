import fs from 'node:fs/promises';
import path from 'node:path';

import { type Command, type OptionValues } from '@commander-js/extra-typings';

import { createPluginCommand } from '../command/create-plugin-command.js';
import { type PluginCommandInitOptions } from '../command/plugin-command-init-options.js';
import { type Package } from '../package/package.js';

const IGNORED_BINS = ['can', 'candr', 'node', 'node-gyp', 'yarn', 'yarnpkg', 'run'];

/**
 * Add commands for running locally installed binaries, as long as the script
 * name does not conflict with a previous command.
 */
export const getBinCommands = async (
  { rootPackage, ...options }: PluginCommandInitOptions & { rootPackage: Package },
): Promise<Command<any[], OptionValues>[]> => {
  const bins = new Set<string>();
  const binDirs = [path.resolve(rootPackage.dir, 'node_modules/.bin')];

  if (process.env.BERRY_BIN_FOLDER) {
    binDirs.push(process.env.BERRY_BIN_FOLDER);
  }

  await Promise.all(binDirs.map(async (dir) => {
    const binEntries = await fs.readdir(dir, { withFileTypes: true })
      .catch((error: any) => {
        if (error?.code !== 'ENOENT') throw error;
        return [];
      });

    Array.from(new Set(binEntries
      .filter((entry) => entry.isFile())
      .map((entry) => path.basename(entry.name).replace(/\.(?:bat|cmd|exe|ps1)$/iu, ''))))
      .filter((bin) => !IGNORED_BINS.includes(bin))
      .forEach((bin) => bins.add(bin));
  }));

  const commands = Array.from(bins)
    .map((bin) => {
      return createPluginCommand(({ createCommand, getProject }) => {
        return createCommand(bin)
          .description(`Run the "${bin}" binary locally installed in the project root package.`)
          .addHelpText('after', (context) => {
            const help = context.command.createHelp();
            const width = help.helpWidth || process.stdout.columns;

            return '\n'
              + help.wrap(`Use the following command to print the full "${bin}" help text:`, width, 0)
              + `\n\n  candr ${bin} --help\n`;
          })
          .helpOption(false)
          .allowUnknownOption()
          .argument('[args...]')
          .action(async (binArgs) => {
            const project = await getProject();

            await project.root.spawn(bin, binArgs, {
              cwd: process.env.INIT_CWD,
              stdin: 'inherit',
              stdout: 'inherit',
              stderr: 'inherit',
              nonZeroResolve: true,
              failureSetExit: true,
            });
          });
      }).init(options);
    });

  return commands;
};
