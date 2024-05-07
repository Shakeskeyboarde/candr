import { type DEPENDENCY_TYPES } from '../util/dependency-types.js';
import { type ProjectPackage } from './project-package.js';

export interface ProjectPackageLink {
  readonly type: typeof DEPENDENCY_TYPES[number];
  readonly key: string;
  readonly value: string;
  readonly package: ProjectPackage;
}
