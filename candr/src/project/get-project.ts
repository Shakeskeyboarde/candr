import { type Package } from '../package/package.js';
import { getNpmProject } from './factories/get-npm-project.js';
import { getPnpmProject } from './factories/get-pnpm-project.js';
import { getUnsupportedProject } from './factories/get-unsupported-project.js';
import { getYarnClassicProject } from './factories/get-yarn-classic-project.js';
import { getYarnProject } from './factories/get-yarn-project.js';
import { type Project } from './project.js';

/**
 * Load a project from the directory. Returns null if the directory is not a
 * package. Throws if the detected root uses an unsupported package manager.
 */
export const getProject = async (root: Package): Promise<Project> => {
  switch (root.packageManager) {
    case 'npm':
      return await getNpmProject(root);
    case 'pnpm':
      return await getPnpmProject(root);
    case 'yarn':
      return await getYarnProject(root);
    case 'yarn@^1':
      return await getYarnClassicProject(root);
    default:
      return await getUnsupportedProject(root);
  }
};
