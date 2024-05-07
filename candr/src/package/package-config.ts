/**
 * Minimal `package.json` type.
 */
export interface PackageConfig {
  readonly name: string;
  readonly [key: string]: unknown;
}
