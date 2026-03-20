import { defineConfig } from 'tsup';

export default [
  // Browser-consumed entries — no createRequire banner (breaks Vite browser bundling)
  defineConfig({
    entry: {
      index: 'src/index.ts',
      'types/schemas/index': 'src/types/schemas/index.ts',
    },
    format: ['esm'],
    platform: 'node',
    dts: true,
    outDir: 'dist',
    clean: true,
    sourcemap: false,
    splitting: false,
  }),
  // Server-only entries — Node.js services only, never imported by browser
  defineConfig({
    entry: {
      'env-loader': 'src/env-loader.ts',
      email: 'src/email.ts',
    },
    format: ['esm'],
    platform: 'node',
    banner: {
      js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
    },
    dts: true,
    outDir: 'dist',
    clean: false,
    sourcemap: false,
    splitting: false,
  }),
];
