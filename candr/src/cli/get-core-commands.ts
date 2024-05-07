import { type Command, type OptionValues } from '@commander-js/extra-typings';

import { type PluginCommandInitOptions } from '../command/plugin-command-init-options.js';
import commandDo from './commands/do.js';
import commandInit from './commands/init.js';
import commandList from './commands/list.js';

export const getCoreCommands = async (
  options: PluginCommandInitOptions,
): Promise<Command<any[], OptionValues>[]> => {
  return [
    commandDo,
    commandInit,
    commandList,
  ].map((plugin) => plugin.init(options));
};
