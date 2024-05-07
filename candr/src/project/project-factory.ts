import { type Package } from '../package/package.js';
import { type Project } from './project.js';

export type ProjectFactory = (
  root: Pick<Package, 'dir' | 'config' | 'isMonorepoRoot' | 'isVirtual'>,
) => Promise<Project>;
