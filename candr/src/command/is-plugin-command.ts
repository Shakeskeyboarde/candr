import { isObject } from '../util/is-object.js';
import { type PluginCommand } from './plugin-command.js';
import { PLUGIN_COMMAND_SYMBOL } from './plugin-command-symbol.js';

export const isPluginCommand = (value: unknown): value is PluginCommand => {
  return isObject(value) && PLUGIN_COMMAND_SYMBOL in value;
};
