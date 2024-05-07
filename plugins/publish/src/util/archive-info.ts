import { type PackageConfig } from 'candr';

export interface ArchiveInfo {
  config: PackageConfig & { version: string };
  size: number;
  totalSize: number;
  files: { filename: string; size: number }[];
}
