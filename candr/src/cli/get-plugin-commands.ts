import { type Command, type OptionValues } from '@commander-js/extra-typings';
import chalk from 'chalk';

import { isPluginCommand } from '../command/is-plugin-command.js';
import { type PluginCommand } from '../command/plugin-command.js';
import { type PluginCommandInitOptions } from '../command/plugin-command-init-options.js';
import { type LoadPluginSuccess } from '../loader/load-plugin-success.js';
import { Loader } from '../loader/loader.js';
import { type Package } from '../package/package.js';

export const getPluginCommands = async (
  { rootPackage, ...options }: PluginCommandInitOptions & { rootPackage: Package },
): Promise<Command<any[], OptionValues>[]> => {
  const plugins = await Loader.loadPlugins(rootPackage, /^(?:@candr\/|(?:@[^/]+\/)?candr-)plugin-/u);
  const commands = plugins
    .flatMap((plugin): LoadPluginSuccess | [] => {
      if ('exports' in plugin) {
        return plugin;
      }

      console.warn(chalk.yellow(`failed loading plugin package "${plugin.id}"`));
      return [];
    })
    .flatMap(({ id, exports }) => Object.entries(exports).map(([key, value]) => ({ id, key, value })))
    .filter((entry): entry is { id: string; key: string; value: PluginCommand } => isPluginCommand(entry.value))
    .flatMap(({ id, key, value }) => {
      try {
        return value.init(options);
      }
      catch (error) {
        console.warn(chalk.yellow(`failed initializing "${key}" command plugin "${id}"`));
        return [];
      }
    });

  return commands;
};
