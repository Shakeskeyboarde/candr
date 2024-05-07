import path from 'node:path';

import { type Package } from '../../package/package.js';
import { readPackages } from '../../package/read-packages.js';
import { spawn } from '../../spawn/spawn.js';
import { Project } from '../project.js';
import { type ProjectFactory } from '../project-factory.js';

export const getNpmProject: ProjectFactory = async ({ isMonorepoRoot, ...root }) => {
  let packages: Package[] = [];

  if (isMonorepoRoot) {
    const { stdout } = await spawn('npm', ['query', '.workspace', '--json'], { cwd: root.dir });
    const objects = stdout.json() as { realpath: string }[];
    const dirs = objects.map((value) => {
      return path.resolve(root.dir, value.realpath);
    });

    packages = await readPackages(dirs);
  }

  return new Project({ root, packages, packageManager: 'npm' });
};
