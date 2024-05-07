import { type PackageConfig } from 'candr';
import semver from 'semver';

export const isPackageConfig = (value: unknown): value is PackageConfig & { version: string } => {
  if (typeof value !== 'object') return false;
  if (value === null) return false;
  if (Array.isArray(value)) return false;
  if (!('name' in value)) return false;
  if (typeof value.name !== 'string') return false;
  if (!('version' in value)) return false;
  if (typeof value.version !== 'string') return false;
  if (!semver.valid(value.version)) return false;

  return true;
};
