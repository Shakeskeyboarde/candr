import type * as commander from '@commander-js/extra-typings';

import { type GlobalOptions } from '../cli/global-options.js';
import { type Loader } from '../loader/loader.js';
import { type Project } from '../project/project.js';

export interface PluginCommandInitContext extends
  Pick<typeof commander, 'createCommand' | 'createOption' | 'createArgument' | 'InvalidArgumentError'> {
  getPlugins: Loader['loadPlugins'];
  getProject: () => Promise<Project>;
  getGlobalOptions: () => Promise<GlobalOptions>;
}
