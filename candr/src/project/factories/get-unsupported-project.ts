import { type Package } from '../../package/package.js';
import { Project } from '../project.js';
import { type ProjectFactory } from '../project-factory.js';

export const getUnsupportedProject = async (
  { packageManager, ...root }: Pick<Package, 'dir' | 'config' | 'packageManager' | 'isVirtual'>,
): ReturnType<ProjectFactory> => {
  return new Project({ root, packageManager });
};
