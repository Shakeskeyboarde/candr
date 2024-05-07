import path from 'node:path';

import gitUrlParse from 'git-url-parse';

import { createPluginCommand } from '../../command/create-plugin-command.js';
import { type SpawnOptions } from '../../spawn/spawn-options.js';
import { createFile } from '../../util/create-file.js';
import { DEPENDENCY_TYPES } from '../../util/dependency-types.js';

const SPAWN_OPTIONS: SpawnOptions = {
  nonZeroResolve: true,
  nonZeroPrint: true,
  failureSetExit: true,
};

const GIT_IGNORE = `
.vscode/
node_modules/
lib/
dist/
out/
coverage/

.DS_Store
.env*
*.tar
*.gz
*.tgz
*.zip
*.log
`.trim() + '\n';

const GIT_IGNORE_YARN = '\n' + `
# Yarn (zero-installs)
.yarn/*
!.yarn/cache
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/sdks
!.yarn/versions
`.trim() + '\n';

export default createPluginCommand(({ createCommand, getProject }) => ({
  filterSupport: false,
  command: createCommand('init')
    .description('Initialize a Candr project.')
    .option('--corepack [package-manager]', 'use corepack, optionally choosing a specific package manager', true)
    .option('--no-corepack', 'do not use corepack')
    .option('--no-git', 'do not use git')
    .action(async ({ corepack, git }) => {
      const { root } = await getProject();
      const packageManager = corepack && typeof corepack === 'string' ? corepack : root.packageManager;
      const gitUrl = await root.spawn('git', ['config', '--get', 'remote.origin.url'], { failureResolve: true })
        .then(({ ok, stdout }) => ok ? gitUrlParse(stdout.string()).toString('https') : null)
        .catch(() => null);
      const packageText = JSON.stringify({
        private: true,
        name: path.basename(root.dir),
        description: '',
        version: '0.1.0-prerelease',
        license: 'UNLICENSED',
        repository: gitUrl
          ? {
            type: 'git',
            url: gitUrl,
          }
          : undefined,
        scripts: {},
        type: 'module',
        publishConfig: {
          access: 'public',
          tag: 'prerelease',
        },
      });

      if (await createFile(`${root.dir}/package.json`, packageText)) {
        root.log.info('created package.json');
      }

      if (corepack && !root.config.packageManager) {
        await root.spawn('corepack', ['enable'], SPAWN_OPTIONS);
        await root.spawn('corepack', ['use', packageManager], SPAWN_OPTIONS);

        root.log.info(`configured corepack (${packageManager})`);
      }

      if (!DEPENDENCY_TYPES.some((type) => (root.config[type] as any)?.['candr'])) {
        await root.spawn('candr', ['add', 'candr', '--dev', '--exact'], SPAWN_OPTIONS);

        root.log.info('added candr dev dependency');
      }

      if (git) {
        const status = await root.spawn('git', ['status'], { failureResolve: true });

        if (typeof status.exitCode === 'number' && status.exitCode !== 0) {
          const ignoreText = GIT_IGNORE + (packageManager.startsWith('yarn') ? GIT_IGNORE_YARN : '');

          await createFile(`${root.dir}/.gitignore`, ignoreText);
          await root.spawn('git', ['init'], SPAWN_OPTIONS);

          root.log.info('initialized git repository');
        }
      }
    }),
}));
