import { type ProjectPackage } from 'candr';

export const getIsModified = async (pkg: ProjectPackage, gitHead: string): Promise<boolean> => {
  const diff = await pkg.spawn('git', ['diff', '--name-only', gitHead, '--', pkg.dir]);

  // Changes have been committed to the directory after gitHead.
  return diff.ok && diff.stdout.string().length > 0;
};
