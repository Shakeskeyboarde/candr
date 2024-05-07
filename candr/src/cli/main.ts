import { CommanderError, createCommand, createOption, InvalidArgumentError } from '@commander-js/extra-typings';

import { log } from '../logger/global-log.js';
import { LOG_LEVEL_NAMES } from '../logger/log-level-names.js';
import { getPackages } from '../package/get-packages.js';
import { type Package } from '../package/package.js';
import { getProject as getProject_ } from '../project/get-project.js';
import { defer } from '../util/defer.js';
import { addCommands } from './add-commands.js';
import { getBinCommands } from './get-bin-commands.js';
import { getCoreCommands } from './get-core-commands.js';
import { getPluginCommands } from './get-plugin-commands.js';
import { getPmCommands } from './get-pm-commands.js';
import { getScriptCommands } from './get-script-commands.js';
import { type GlobalOptions } from './global-options.js';
import { init } from './init.js';
import data from './main.data.js';

export default async (args = process.argv.slice(2)): Promise<void> => {
  const packages = await getPackages(process.env.INIT_CWD ?? process.cwd());
  const rootPackage = packages.at(-1) as Package;
  const nearestPackage = packages[0];

  const [getGlobalOptions, initGlobalOptions] = defer<GlobalOptions>();
  const [getProject, initProject] = defer(async ({
    filter,
    filterAllowRoot,
    parallel,
    stream,
    concurrency,
    delay,
  }: GlobalOptions) => {
    const project = await getProject_(rootPackage);

    if (filter[0]) {
      // If a the first filter does not start with '!', then clear the default
      // selection so that the first filter is the initial selection.

      if (!filter[0].startsWith('!')) {
        project.packages.array.forEach((package_) => package_.isSelected = false);
      }

      project.packages.filter(...filter);
    }
    else {
      // If there are no filters set and the nearest package is not the root,
      // then the default selection is only the nearest package.
      const nearest = project.packages.getFilePackage(process.env.INIT_CWD ?? process.cwd());

      if (nearest && nearest !== project.root) {
        project.packages.array.forEach((package_) => package_.isSelected = package_ === nearest);
      }
    }

    // Unselect the root unless the allow flag is set, or there is only one
    // package in the project.
    if (!filterAllowRoot && project.packages.size > 1) {
      project.packages.root.isSelected = false;
    }

    project.packages.concurrency = concurrency;
    project.packages.parallel = stream ? 'stream' : parallel;
    project.packages.delayMs = delay * 1000;

    return project;
  });

  const [pluginCommands, coreCommands, pmCommands, scriptCommands, binCommands] = await Promise.all([
    getPluginCommands({ getProject, getGlobalOptions, rootPackage }),
    getCoreCommands({ getProject, getGlobalOptions }),
    getPmCommands({ getProject, getGlobalOptions }),
    getScriptCommands({ getProject, getGlobalOptions, nearestPackage }),
    getBinCommands({ getProject, getGlobalOptions, rootPackage }),
  ]);
  const subCommands = [pluginCommands, coreCommands, pmCommands, scriptCommands, binCommands].flat();
  const subCommandNames = new Set(subCommands.map((value) => value.name()));

  const command = createCommand(data.name)
    .usage('[options] <command>')
    .description(data.description)
    .allowUnknownOption(false)
    .allowExcessArguments(false)
    .addOption(
      createOption('--log-level <level>', 'set the log level')
        .choices(LOG_LEVEL_NAMES),
    )
    .option('--no-color', 'disable color output')
    .option(
      '--filter <name>',
      'filter packages by name (repeatable, glob supported)',
      (value, previous: string[] = []) => [...previous, value],
    )
    .option('--filter-allow-root', 'allow filtering to match the root package')
    .option('--parallel', 'process all packages at once without dependency awaiting')
    .option('--stream', 'process packages concurrently with dependency awaiting')
    .option('--concurrency <count>', 'maximum number of streaming parallel tasks', (value) => {
      if (value === 'auto') return 'auto';

      const number = Number(value);

      if (!Number.isInteger(number) || number < 1) {
        throw new InvalidArgumentError('concurrency must be a non-zero positive integer');
      };

      return number;
    })
    .option('--delay <seconds>', 'minimum delay between packages', (value) => {
      const number = Number(value);

      if (Number.isNaN(number) || number < 0) {
        throw new InvalidArgumentError('delay must be a non-negative number');
      }

      return number;
    })
    .version(data.version, '-v, --version')
    .helpCommand(false)
    .configureHelp({
      subcommandTerm: (cmd) => cmd.name(),
    })
    .addHelpText('after', (context) => {
      if (scriptCommands.length) {
        const help = context.command.createHelp();

        return '\nPackage Scripts:\n  ' + help.wrap(
          scriptCommands.map((value) => value.name()).join(', '),
          help.helpWidth || process.stdout.columns,
          2,
        );
      }

      return '';
    })
    .addHelpText('after', (context) => {
      if (binCommands.length) {
        const help = context.command.createHelp();

        return '\nLocal Binaries:\n  ' + help.wrap(
          binCommands.map((value) => value.name()).join(', '),
          help.helpWidth || process.stdout.columns,
          2,
        );
      }

      return '';
    })
    .hook('preSubcommand', async (self) => {
      const partialOptions = self.opts();
      const globalOptions = init(partialOptions);

      initGlobalOptions(globalOptions);
      initProject(globalOptions);
    });

  // Default command handles unknown options and commands.
  command
    .command('<UNKNOWN>', { hidden: true, isDefault: true })
    .helpOption(false)
    .allowUnknownOption()
    .allowExcessArguments()
    .argument('[command]')
    .action(async (unknownCommand, _, self) => {
      const help = self.createHelp();
      const wrap = (text: string, indent = 0): string => {
        return ''.padEnd(indent, ' ') + help.wrap(
          text.trim().replaceAll(/\s*\n\s*/gu, ' '),
          help.helpWidth || process.stdout.columns,
          indent,
        );
      };

      process.exitCode ||= 1;

      if (unknownCommand?.startsWith('-')) {
        console.error(wrap(`error: unknown option '${unknownCommand}'`));
      }
      else if (unknownCommand) {
        console.error([
          wrap(`error: unknown command '${unknownCommand}'`),
          wrap(`
              You can install Candr plugins to add additional commands. Candr
              plugins are NPM packages that start with the "candr-plugin-" or
              "@<scope>/candr-plugin-" prefix.
            `),
          wrap(`
              Try using the following NPM search URL to find Candr plugins:
            `),
          wrap(`https://www.npmjs.com/search?q=keywords:candr-plugin`, 2),
          wrap(`See the docs for more information:`),
          wrap(`https://github.com/Shakeskeyboarde/candr/blob/main/candr/README.md`, 2),
          wrap(`Run the following to see all can available commands:`),
          wrap(`${command.name()} --help`, 2),
        ].join('\n\n') + '\n');

        return;
      }
      else {
        console.error(wrap('error: command is required'));
      }

      console.error();
      command.outputHelp({ error: true });
    });

  // Remove any aliases that conflict with command names, so that command names
  // have priority over aliases.
  subCommands.forEach((subCommand) => {
    const aliases = subCommand
      .aliases()
      .filter((alias) => alias !== 'help' && !subCommandNames.has(alias));

    subCommand.aliases().splice(0, subCommand.aliases().length, ...aliases);
  });

  addCommands(command, coreCommands);
  addCommands(command, pluginCommands, 'sorted');
  addCommands(command, pmCommands);
  addCommands(command, scriptCommands, 'hidden');
  addCommands(command, binCommands, 'hidden');

  if (!subCommandNames.has('help')) {
    command.helpCommand('help', 'Display help for a command.');
  }

  await command
    .exitOverride()
    .parseAsync(args, { from: 'user' })
    .catch((error: unknown) => {
      if (error instanceof CommanderError) {
        process.exitCode ||= error.exitCode;
      }
      else {
        process.exitCode ||= 1;
        log.error(error);
      }
    });
};
