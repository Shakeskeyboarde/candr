import { type Command, type OptionValues } from '@commander-js/extra-typings';

import { type PluginCommandInitOptions } from '../command/plugin-command-init-options.js';
import commandAdd from './commands/add.js';
import commandInstall from './commands/install.js';
import commandRemove from './commands/remove.js';

export const getPmCommands = async (
  options: PluginCommandInitOptions,
): Promise<Command<any[], OptionValues>[]> => {
  return [
    commandInstall,
    commandAdd,
    commandRemove,
  ].map((plugin) => plugin.init(options));
};
