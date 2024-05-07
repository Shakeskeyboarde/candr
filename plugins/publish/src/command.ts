import fs from 'node:fs/promises';
import path from 'node:path';

import { createPluginCommand, type ProjectPackage } from 'candr';
import chalk from 'chalk';

import { pack } from './pack.js';
import { publish } from './publish.js';
import { getArchiveInfo } from './util/get-archive-info.js';
import { getEntrypoints } from './util/get-entrypoints.js';
import { getFriendlySize } from './util/get-friendly-size.js';
import { getIsDirty } from './util/get-is-dirty.js';
import { getIsModified } from './util/get-is-modified.js';
import { getInfo } from './util/get-registry-info.js';

export default createPluginCommand(({ createCommand, getProject }) => {
  return createCommand('publish')
    .description('Publish project packages to registries.')
    .option('--dry-run', 'make no changes and only report what would be done')
    .option('--otp <otp>', 'one-time password for registry two-factory auth')
    .option('--tag <tag>', 'register the published package with the given dist-tag')
    .addHelpText('after', ({ command }) => {
      const help = command.createHelp();

      return '\n'
        + help.wrap(`Other package manager specific settings can be configured using .npmrc files (or equivalent) and package.json file publishConfig fields.`, process.stdout.columns, 0)
        + '\n';
    })
    .action(async ({ dryRun, otp, tag }) => {
      const project = await getProject();

      if (dryRun && project.packageManager === 'yarn@^1') {
        throw new Error('dry-run not supported in yarn v1');
      }

      if (otp && project.packageManager === 'yarn@^1') {
        throw new Error('otp not supported in yarn v1');
      }

      if (project.packages.parallel === true) {
        // XXX: Don't allow full parallelism when publishing packages, because
        // it might result in publishing a dependent without its dependency.
        project.packages.parallel = 'stream';
      }

      const published = new Set<ProjectPackage>();

      const success = await project.packages.forEach(async (pkg, abort) => {
        if (pkg.config.private) {
          return;
        }

        if (await getIsDirty(pkg)) {
          throw new Error('uncommitted changes');
        }

        const info = await getInfo(pkg);

        // The package version is already published, and either:
        // - there is no associated git head
        // - there are no package commits after the associated git head
        if (info && (!info.gitHead || await getIsModified(pkg, info.gitHead))) {
          published.add(pkg);
        }

        if (!pkg.isSelected) {
          return;
        }

        if (info) {
          pkg.log.info('version already published');
          return;
        }

        // Skip if a local dependency is unpublished or modified.
        if (pkg.getLocalDependencies().some((dep) => !published.has(dep.package))) {
          pkg.log.warn('dependency unpublished or modified');
          return;
        }

        // Create a temporary package archive if one wasn't provided.
        const archive = await pack(pkg);

        if (!archive) {
          abort();
          return;
        }

        const archiveInfo = await getArchiveInfo(archive);
        const archiveFilenames = archiveInfo.files.map(({ filename }) => filename);
        const entrypoints = getEntrypoints(archiveInfo.config);
        const isEntrypointMissing = entrypoints.reduce((acc, entrypoint) => {
          if (entrypoint.includes('*')) {
            // Package exports paths can have wildcards (*). Convert them to
            // regular expressions for matching.
            // https://nodejs.org/api/packages.html#subpath-patterns

            const pattern = entrypoint.replaceAll(
              /[.*+?^${}()|[\]\\]/gu,
              (match) => match === '*' ? '.*' : `\\${match}`,
            );
            const rx = new RegExp(`^${pattern}$`, 'u');

            if (archiveFilenames.some((filename) => rx.test(filename))) return acc;
          }
          else {
            if (archiveFilenames.includes(entrypoint)) return acc;
          }

          pkg.log.error(`entrypoint "${entrypoint}" not included in archive`);

          return true;
        }, false);

        if (isEntrypointMissing) {
          abort();
          return;
        }

        pkg.log.info(`${archiveInfo.config.name}@${archiveInfo.config.version}`);
        archiveInfo.files.forEach(({ filename, size }) => {
          pkg.log.info(`+ ${filename} ${chalk.dim(getFriendlySize(size))}`);
        });
        pkg.log.info(`total size = ${getFriendlySize(archiveInfo.totalSize)}`);
        pkg.log.info(`archive size = ${getFriendlySize(archiveInfo.size)}`);

        try {
          if (await publish(pkg, archive, { dryRun, otp, tag })) {
            pkg.log.info(`published${dryRun ? ' (dry-run)' : ''}`);
            published.add(pkg);
          }
          else {
            abort();
            return;
          }
        }
        finally {
          // Cleanup the temporary archive.
          await fs.rm(path.dirname(archive), { recursive: true, force: true });
        }
      });

      if (!success) {
        process.exitCode ||= 1;
      }
    });
});
