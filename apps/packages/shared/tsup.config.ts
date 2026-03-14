import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'types/schemas/index': 'src/types/schemas/index.ts',
    'env-loader': 'src/env-loader.ts',
    email: 'src/email.ts',
  },
  format: ['esm'],
  dts: true,
  outDir: 'dist',
  clean: true,
  sourcemap: false,
  splitting: false,
});
