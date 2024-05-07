import { type Command, type OptionValues } from '@commander-js/extra-typings';

export interface PluginCommandInitResult {
  command: Command<any[], OptionValues>;
  filterSupport?: boolean;
}
