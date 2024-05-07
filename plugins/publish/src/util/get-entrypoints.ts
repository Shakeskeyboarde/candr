import path from 'node:path/posix';

export const getEntrypoints = (config: Record<string, unknown>): string[] => {
  return getRecursiveStrings([
    config.types,
    config.typings,
    config.main,
    config.bin,
    config.module,
    config.browser,
    config.exports,
  ]).map((value) => path.normalize(value));
};

const getRecursiveStrings = (value: unknown): string[] => {
  if (typeof value === 'string') {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap(getRecursiveStrings);
  }

  if (typeof value === 'object' && value !== null) {
    return Object.values(value).flatMap(getRecursiveStrings);
  }

  return [];
};
