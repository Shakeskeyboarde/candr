import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Generator which yields the child directories (absolute) of a directory
 * (non-inclusive).
 */
export const generateDirsDown = async function *(dir: string): AsyncGenerator<string> {
  const entries = await fs.opendir(dir);

  try {
    for await (const entry of entries) {
      if (entry.isDirectory()) {
        const child = path.resolve(dir, entry.name);
        yield child;
        yield* generateDirsDown(child);
      }
    }
  }
  finally {
    await entries.close().catch((error: any) => {
      if (error?.code !== 'ERR_DIR_CLOSED') throw error;
    });
  }
};
