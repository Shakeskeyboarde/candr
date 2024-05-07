import { type GlobalOptions } from '../cli/global-options.js';
import { type Project } from '../project/project.js';

export interface PluginCommandInitOptions {
  getProject: () => Promise<Project>;
  getGlobalOptions: () => Promise<GlobalOptions>;
}
