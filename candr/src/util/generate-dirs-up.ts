import path from 'node:path';

/**
 * Generator which yields the parent directories (absolute) of a directory
 * (inclusive).
 */
export const generateDirsUp = function *pathTraverseUp(dir: string): Generator<string, undefined, undefined> {
  dir = path.resolve(dir);

  do {
    yield dir;
  } while (dir !== (dir = path.dirname(dir)));
};
