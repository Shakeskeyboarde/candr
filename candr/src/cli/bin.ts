import cp from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import url from 'node:url';

import { getPackages } from '../package/get-packages.js';
import { type Package } from '../package/package.js';

const PNP_CJS = '.pnp.cjs';
const PNP_MJS = '.pnp.loader.mjs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const packages = await getPackages(process.cwd());
const root = packages.at(-1) as Package;

process.env.CANDR_INIT_CWD = process.cwd();
process.chdir(root.dir);

const isYarnPnpBootRequired = await (async (): Promise<boolean> => {
  if (root.packageManager !== 'yarn') {
    // Not Yarn Berry.
    return false;
  }

  if (await Promise.all([
    fs.access(PNP_CJS).then(() => true, () => false),
    fs.access(PNP_MJS).then(() => true, () => false),
  ]).then((results) => !results.some(Boolean))) {
    // No PnP loaders found.
    return false;
  }

  if (process.env.BERRY_BIN_FOLDER) {
    // Node is already Yarn PnP bootstrapped.
    return false;
  }

  return true;
})();

if (isYarnPnpBootRequired) {
  const p = cp.spawn('yarn', [
    'node',
    path.resolve(__dirname, 'boot.js'),
    ...process.argv.slice(2),
  ], {
    stdio: 'inherit',
  });

  const exitCode = await new Promise<number>((resolve, reject) => {
    p.on('error', reject);
    p.on('exit', resolve);
  });

  // eslint-disable-next-line unicorn/no-process-exit
  process.exit(exitCode);
}

await import('./boot.js');
