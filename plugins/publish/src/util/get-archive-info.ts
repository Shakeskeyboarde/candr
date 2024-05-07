import fs from 'node:fs/promises';
import path from 'node:path';
import streamConsumers from 'node:stream/consumers';
import zlib from 'node:zlib';

import tar from 'tar-stream';

import { type ArchiveInfo } from './archive-info.js';
import { isPackageConfig } from './is-package-config.js';

export const getArchiveInfo = async (archive: string): Promise<ArchiveInfo> => {
  const handle = await fs.open(archive, 'r');

  try {
    const stats = await handle.stat();
    const extract = handle.createReadStream().pipe(zlib.createGunzip()).pipe(tar.extract());
    const files: ArchiveInfo['files'] = [];

    let config: ArchiveInfo['config'] | undefined;
    let totalSize = 0;

    for await (const entry of extract) {
      const filename = path.relative('package', entry.header.name);
      const buffer = await streamConsumers.buffer(entry);

      if (filename === 'package.json') {
        try {
          const text = buffer.toString('utf8');
          const data: unknown = JSON.parse(text);

          if (!isPackageConfig(data))
            throw new Error('invalid archive package.json file');

          config = data;
        }
        catch (error) {
          throw new Error('invalid archive package.json file', { cause: error });
        }
      }

      totalSize += buffer.length;
      files.push({ filename, size: buffer.length });
    }

    if (!config) {
      throw new Error('missing archive package.json file');
    }

    files.sort((a, b) => {
      return (
        Number(!a.filename.includes('/')) - Number(!b.filename.includes('/'))
        || a.filename.localeCompare(b.filename)
      );
    });

    return { config, size: stats.size, totalSize, files };
  }
  finally {
    await handle.close();
  }
};
