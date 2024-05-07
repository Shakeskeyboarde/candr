import { createPluginCommand } from '../../command/create-plugin-command.js';
import { type SpawnOptions } from '../../spawn/spawn-options.js';

const SPAWN_OPTIONS: SpawnOptions = {
  stdin: 'inherit',
  stdout: 'inherit',
  nonZeroResolve: true,
  failureSetExit: true,
};

export default createPluginCommand(({ createCommand, getProject }) => ({
  filterSupport: false,
  command: createCommand('install')
    .aliases(['i', 'restore'])
    .description('Install dependencies in all project packages.')
    .option('--frozen-lockfile', 'fail if a lockfile update is needed')
    .option('--ignore-scripts', 'do not run lifecycle scripts')
    .action(async ({ frozenLockfile, ignoreScripts }) => {
      const project = await getProject();

      switch (project.packageManager) {
        case 'npm':
          await project.root.spawn(frozenLockfile ? 'ci' : 'npm', ['install', {
            '--ignore-scripts': ignoreScripts,
          }], SPAWN_OPTIONS);
          break;
        case 'pnpm':
          await project.root.spawn('pnpm', ['install', {
            '--ignore-scripts': ignoreScripts,
            '--frozen-lockfile': frozenLockfile,
          }], SPAWN_OPTIONS);
          break;
        case 'yarn@^1':
          await project.root.spawn('yarn', ['install', {
            '--ignore-scripts': ignoreScripts,
            '--frozen-lockfile': frozenLockfile,
          }], SPAWN_OPTIONS);
          break;
        case 'yarn':
          await project.root.spawn('yarn', ['install', {
            '--mode=skip-build': ignoreScripts,
            '--immutable': frozenLockfile,
          }], SPAWN_OPTIONS);
          break;
        default:
          throw new Error('unsupported package manager');
      }
    }),
}));
