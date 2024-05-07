import fs from 'node:fs/promises';
import path from 'node:path';

const text = await fs.readFile(path.resolve(__dirname, '../../package.json'), 'utf-8');
const data: { name: string; version?: string; description?: string } = JSON.parse(text);

/**
 * Package data at build-time.
 */
export default {
  name: data.name,
  version: data.version ?? '0.0.0',
  description: data.description ?? '',
};
