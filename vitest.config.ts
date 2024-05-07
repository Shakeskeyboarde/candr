import { defineConfig } from 'vitest/config';

const TEST_GLOBS = ['**/__{tests|mocks}__', '**/*.{test|spec}.*]'];

process.chdir(__dirname);

export default defineConfig({
  test: {
    reporters: ['verbose'],
    setupFiles: './vitest.setup.ts',
    coverage: {
      enabled: true,
      all: true,
      reporter: ['html', 'text-summary', 'lcovonly'],
      reportsDirectory: './coverage',
      include: ['**/src/**/*.?(c|m)[jt]s?(x)'],
      exclude: [...TEST_GLOBS, '**/src/**/index.ts'],
    },
  },
});
