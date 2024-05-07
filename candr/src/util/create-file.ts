import fs from 'node:fs/promises';
import type stream from 'node:stream';

/**
 * Create a file if it does not exist.
 */
export const createFile = async (filename: string, content:
  | string
  | NodeJS.ArrayBufferView
  | Iterable<string | NodeJS.ArrayBufferView>
  | AsyncIterable<string | NodeJS.ArrayBufferView>
  | stream.Stream): Promise<boolean> => {
  try {
    await fs.writeFile(filename, content, { flag: 'wx' });
    return true;
  }
  catch (error: any) {
    if (error?.code !== 'EEXIST') throw error;
    return false;
  }
};
