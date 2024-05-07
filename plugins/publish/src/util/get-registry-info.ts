import { type ProjectPackage } from 'candr';

import { type RegistryInfo } from './registry-info.js';

export const getInfo = async (pkg: ProjectPackage): Promise<RegistryInfo | undefined> => {
  if (typeof pkg.config.version !== 'string') return;

  const pm = pkg.project.packageManager.split('@', 2)[0]!;
  const { ok, stdout } = await pkg.spawn(pm, ['info', `${pkg.config.name}@${pkg.config.version}`, '--json'], {
    failureResolve: true,
  });

  if (!ok) return;

  const info = stdout.json<any>();
  // Yarn v1 puts the info in an envelope under the "data" key.
  const data = 'data' in info ? info.data : info;

  // The version returned may not match the requested version. Yarn v2 will
  // just return the latest version if it can't find a match.
  if (data?.version !== pkg.config.version) return;

  // The gitHead isn't always present. NPM publishes it automatically, and the
  // Candr version command adds it to the package.json file, but not all
  // package managers or publishing workflows will include it.
  if (typeof data?.gitHead !== 'string') return {};

  return { gitHead: data.gitHead };
};
