import path from 'node:path';

import { type Package } from '../../package/package.js';
import { readPackages } from '../../package/read-packages.js';
import { spawn } from '../../spawn/spawn.js';
import { Project } from '../project.js';
import { type ProjectFactory } from '../project-factory.js';

export const getPnpmProject: ProjectFactory = async ({ isMonorepoRoot, ...root }) => {
  let packages: Package[] = [];

  if (isMonorepoRoot) {
    // const { stdout } = await $({ cwd: root.dir })`pnpm list -r --depth=-1 --json`;
    const { stdout } = await spawn('pnpm', ['list', '-r', '--depth=-1', '--json'], { cwd: root.dir });

    try {
      const objects = stdout.json() as { path: string }[];
      const dirs = objects
        // XXX: The first entry will be the root package, so skip it.
        .slice(1)
        .map((value) => {
          return path.resolve(root.dir, value.path);
        });

      packages = await readPackages(dirs);
    }
    catch (error: any) {
      // XXX: The PNPM recursive list command outputs invalid JSON (multiple
      // independent arrays) when the project is not a workspace project. In
      // that case, return an empty array.
      if (error?.name !== 'SyntaxError') throw error;
    }
  }

  return new Project({ root, packages, packageManager: 'pnpm' });
};
