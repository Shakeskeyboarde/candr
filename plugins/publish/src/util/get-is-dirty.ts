import { type ProjectPackage } from 'candr';

export const getIsDirty = async (pkg: ProjectPackage): Promise<boolean> => {
  const status = await pkg.spawn('git', ['status', '--porcelain', pkg.dir]);

  // The working directory is not clean. It contains modifications, deletes, or
  // new files.
  if (status.ok && status.stdout.string().length) return true;

  return false;
};
