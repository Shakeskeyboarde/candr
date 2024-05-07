import path from 'node:path';

import { Loader } from '../loader/loader.js';
import defaultMain from './main.js';

process.env.INIT_CWD = process.env.CANDR_INIT_CWD;
process.env.PATH = [path.resolve('node_modules/.bin'), process.env.PATH]
  .filter(Boolean)
  .join(path.delimiter);

const main = await Loader.load(process.cwd(), 'candr/main')
  .then((exports): typeof defaultMain => exports.default)
  .catch(async () => defaultMain);

await main(process.argv.slice(2));
