import { type Command, type OptionValues } from '@commander-js/extra-typings';

import { type PluginCommandInitContext } from './plugin-command-init-context.js';
import { type PluginCommandInitResult } from './plugin-command-init-result.js';

export type PluginCommandInit = (
  context: PluginCommandInitContext
) => Command<any[], OptionValues> | PluginCommandInitResult;
