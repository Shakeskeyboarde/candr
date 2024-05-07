import { PluginCommand } from './plugin-command.js';
import { type PluginCommandInit } from './plugin-command-init.js';

export const createPluginCommand = (init: PluginCommandInit): PluginCommand => {
  return new PluginCommand(init);
};
