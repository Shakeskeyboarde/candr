import { type ProjectPackage } from 'candr';

export const publish = async (
  pkg: ProjectPackage,
  archive: string,
  options: { dryRun?: boolean; otp?: string; tag?: string },
): Promise<boolean> => {
  const pm = pkg.packageManager.split('@', 2)[0]!;
  const { ok } = await pkg.spawn(pm, [
    pkg.packageManager === 'yarn' && 'npm',
    'publish',
    archive,
    {
      '--dry-run': options.dryRun,
      '--otp': options.otp,
      '--tag': options.tag,
      '--no-git-checks': pkg.packageManager === 'pnpm',
    },
  ], {
    nonZeroPrint: true,
    nonZeroResolve: true,
    failureSetExit: true,
  });

  return ok;
};
