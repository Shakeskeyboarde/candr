import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { type ProjectPackage } from 'candr';

export const pack = async (pkg: ProjectPackage): Promise<string | undefined> => {
  const pm = pkg.packageManager.split('@', 2)[0]!;
  const tmp = await fs.mkdtemp(path.resolve(os.tmpdir(), 'candr-pack-'));

  const { ok } = await pkg.spawn(pm, ['pack', {
    '--pack-destination': (pkg.packageManager === 'npm' || pkg.packageManager === 'pnpm') && tmp,
    '--out': pkg.packageManager === 'yarn' && path.join(tmp, 'package.tgz'),
    '--filename': pkg.packageManager === 'yarn@^1' && path.join(tmp, 'package.tgz'),
  }], {
    // stdout: 'inherit',
    nonZeroPrint: true,
    nonZeroResolve: true,
    failureSetExit: true,
  });

  if (!ok) return;

  const files = await fs.readdir(tmp);
  const filename = files.find((value) => value.endsWith('.tgz'));

  return filename ? path.join(tmp, filename) : undefined;
};
