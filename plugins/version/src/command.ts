import { createPluginCommand } from 'candr';

export default createPluginCommand(({ createCommand }) => {
  return createCommand('version')
    .description('Update project package versions.')
    .action(async () => {
      //
    });
});
