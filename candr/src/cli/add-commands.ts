import { type Command, type OptionValues } from '@commander-js/extra-typings';

export const addCommands = (
  parent: Command<any[], OptionValues>,
  commands: Command<any[], OptionValues>[],
  mode?: 'hidden' | 'sorted',
): string[] => {
  if (mode === 'sorted') {
    commands.sort((a, b) => a.name().localeCompare(b.name()));
  }

  return commands
    .filter((command) => {
      try {
        parent.addCommand(command, { hidden: mode === 'hidden' });
        return true;
      }
      catch {
        return false;
      }
    })
    .map((command) => command.name());
};
