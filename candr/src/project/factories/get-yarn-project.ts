import path from 'node:path';

import { type Package } from '../../package/package.js';
import { readPackages } from '../../package/read-packages.js';
import { spawn } from '../../spawn/spawn.js';
import { Project } from '../project.js';
import { type ProjectFactory } from '../project-factory.js';

export const getYarnProject: ProjectFactory = async ({ isMonorepoRoot, ...root }) => {
  let packages: Package[] = [];

  if (isMonorepoRoot) {
    // const { stdout } = await $({ cwd: root.dir })`yarn workspaces list --json`;
    const { stdout } = await spawn('yarn', ['workspaces', 'list', '--json'], { cwd: root.dir });

    const lines = stdout
      // XXX: The Yarn workspaces list command outputs one JSON object per
      // line, rather than a single JSON array of objects.
      .lines()
      // XXX: The first entry will be the root package, so skip it.
      .slice(1);

    const dirs = lines.map((line) => JSON.parse(line) as { location: string })
      .map((value) => path.resolve(root.dir, value.location));

    packages = await readPackages(dirs);
  }

  return new Project({ root, packages, packageManager: 'yarn' });
};
