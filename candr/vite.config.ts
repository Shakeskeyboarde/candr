import { defineConfig } from 'vite';
import { checker } from 'vite-plugin-checker';
import { lib } from 'vite-plugin-config-lib';
import { data } from 'vite-plugin-data';
import dts from 'vite-plugin-dts';

const TEST_GLOBS = ['**/__{tests|mocks}__', '**/*.{test|spec}.*]'];

process.chdir(__dirname);

export default defineConfig({
  plugins: [
    checker({
      typescript: true,
    }),
    lib({
      entry: [
        'src/index.ts',
        'src/cli/bin.ts',
        'src/cli/boot.ts',
        'src/cli/main.ts',
      ],
      bundle: true,
      external: false,
      target: 'node20',
    }),
    data(),
    dts({
      entryRoot: 'src',
      logLevel: 'error',
      exclude: TEST_GLOBS,
    }),
  ],
});
