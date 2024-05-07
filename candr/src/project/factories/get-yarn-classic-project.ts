import path from 'node:path';

import { type Package } from '../../package/package.js';
import { readPackages } from '../../package/read-packages.js';
import { spawn } from '../../spawn/spawn.js';
import { Project } from '../project.js';
import { type ProjectFactory } from '../project-factory.js';

export const getYarnClassicProject: ProjectFactory = async ({ isMonorepoRoot, ...root }) => {
  let packages: Package[] = [];

  if (isMonorepoRoot) {
    const { ok, stdout } = await spawn('yarn', ['--silent', 'workspaces', 'info'], {
      cwd: root.dir,
      errorResolve: true,
    });

    // XXX: The Yarn workspaces info command exits with a non-zero exit code
    // when the project is not a workspace project.
    if (ok) {
      const object = stdout.json() as Record<string, { location: string }>;
      const values = Object.values(object);
      const dirs = values.map((value) => {
        return path.resolve(root.dir, value.location);
      });

      packages = await readPackages(dirs);
    }
  }

  return new Project({ root, packages, packageManager: 'yarn@^1' });
};
