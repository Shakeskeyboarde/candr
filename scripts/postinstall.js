#!/usr/bin/env node
import path from 'node:path';
import url from 'node:url';

import { $, ExecaError } from 'execa';
import glob from 'fast-glob';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const viteConfigs = await glob('**/vite.config.ts', {
  ignore: ['**/node_modules'],
  cwd: `${__dirname}/..`,
  absolute: true,
});

for (const viteConfig of viteConfigs) {
  console.error(`building ${viteConfig}`);

  await $({ preferLocal: true, all: true })`vite -c ${viteConfig} build`.catch((error) => {
    console.error(error instanceof ExecaError ? error.all : error);
    process.exitCode = 1;
    return;
  });
}
