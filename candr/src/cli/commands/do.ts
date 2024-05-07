import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { createPluginCommand } from '../../command/create-plugin-command.js';
import { confirm } from '../../util/confirm.js';

const CACHE_PREFIX = path.resolve(os.userInfo().homedir, '.candr', 'cache', 'do');
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export default createPluginCommand(({ createCommand, getProject }) => ({
  filterSupport: false,
  command: createCommand('do')
    .alias('dlx')
    .description('Fetch and run a package from the registry.')
    .argument('[command]')
    .argument('[args...]')
    .option(
      '--package <spec>',
      'package to fetch from the registry (repeatable)',
      (value, previous: string[] = []) => [...previous, value],
    )
    .option('--clear-cache', 'clear the download cache')
    .option('--force', `do not confirm before installing packages`)
    .allowUnknownOption()
    .action(async (command, args, { clearCache, package: packages, force = false }, self) => {
      const project = await getProject();

      if (!command) {
        if (clearCache) {
          await fs.rm(CACHE_PREFIX, { recursive: true, force: true });
          console.log('Candr do cache cleared successfully.');
          return;
        }

        return self.error('error: missing command');
      }

      const dependencies = Object.fromEntries((packages?.length ? packages : [command])
        .sort()
        .map((package_): [string, string] => {
          const [name = '', spec = 'latest'] = package_.split(/(?<!^)@/u, 2);
          return [name, spec];
        }));
      const hash = crypto.createHash('sha256').update(JSON.stringify(dependencies)).digest('hex');
      const tmpDir = path.join(CACHE_PREFIX, hash);
      const mtime = await fs.stat(tmpDir).then((stats) => stats.mtime.valueOf()).catch(() => 0);

      if (clearCache || mtime < Date.now() - WEEK_MS) {
        if (!force && process.stdin.isTTY) {
          console.error(`Installing the following packages:`);
          Object.entries(dependencies).forEach(([name, spec]) => console.error(`  ${name}@${spec}`));

          if (!await confirm('Is this correct?', true)) {
            console.error('canceled');
            return;
          }
        }

        await fs.rm(tmpDir, { recursive: true, force: true });
        await fs.mkdir(tmpDir, { recursive: true });
        await fs.writeFile(`${tmpDir}/package.json`, JSON.stringify({ dependencies }));
      }

      const install = await project.root.spawn('npm', ['install', '--loglevel', 'error'], {
        cwd: tmpDir,
        failureSetExit: true,
        nonZeroResolve: true,
        nonZeroPrint: true,
      });

      if (!install.ok) return;

      await project.root.spawn(
        command.replace(/(?<!^)@.*$/u, ''),
        args,
        {
          cwd: process.env.INIT_CWD,
          path: [`${tmpDir}/node_modules/.bin`],
          stdin: 'inherit',
          stdout: 'inherit',
          nonZeroResolve: true,
          failureSetExit: true,
        },
      );
    }),
}));
