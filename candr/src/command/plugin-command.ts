import {
  type Command,
  createArgument,
  createCommand,
  createOption,
  InvalidArgumentError,
  type OptionValues,
} from '@commander-js/extra-typings';

import { Loader } from '../loader/loader.js';
import { log } from '../logger/global-log.js';
import { type PluginCommandInit } from './plugin-command-init.js';
import { type PluginCommandInitOptions } from './plugin-command-init-options.js';
import { type PluginCommandInitResult } from './plugin-command-init-result.js';
import { PLUGIN_COMMAND_SYMBOL } from './plugin-command-symbol.js';

export class PluginCommand {
  readonly [PLUGIN_COMMAND_SYMBOL] = true;
  readonly #init: PluginCommandInit;

  constructor(init: PluginCommandInit) {
    this.#init = init;
  }

  readonly init = ({ getProject, getGlobalOptions }: PluginCommandInitOptions): Command<any[], OptionValues> => {
    const result = this.#init(
      {
        getPlugins: Loader.loadPlugins,
        getProject,
        getGlobalOptions,
        createCommand: (name) => createCommand(name)
          .allowExcessArguments(false)
          .configureHelp({
            showGlobalOptions: true,
            commandUsage: (cmd) => {
              let fullName = cmd.name();

              for (let ancestor = cmd.parent; ancestor; ancestor = ancestor.parent) {
                fullName = ancestor.name() + ' ' + fullName;
              }

              return fullName + ' ' + cmd.usage();
            },
            subcommandTerm: (cmd) => cmd.name(),
          }),
        createOption,
        createArgument,
        InvalidArgumentError,
      },
    );

    const { command, filterSupport = true } = typeof result.command === 'function'
      ? { command: result as Command<any[], OptionValues> }
      : result as PluginCommandInitResult;

    return command
      .addHelpText('after', (context) => {
        const aliases = context.command.aliases();

        if (aliases.length) {
          const help = context.command.createHelp();

          return '\nAliases:\n  ' + help.wrap(
            aliases.map((value) => value).join(', '),
            help.helpWidth ?? process.stdout.columns,
            2,
          );
        }

        return '';
      })
      .hook('preAction', async () => {
        if (!filterSupport) {
          const globalOptions = await getGlobalOptions();

          if (globalOptions.filter.length) {
            log.warn(`filtering has no effect on the "${command.name()}" command`);
            log.flush();
          }
        }
      });
  };
}
