import { defineConfig } from 'vite';

// The library apps load from this site: /v1/ds.css, /v1/ds.js (ES module) and /v1/ds.iife.js.
// A regular build rather than library mode, because library mode inlines the fonts into the CSS.
// `--mode iife` adds the classic-script build; it skips the CSS, which the ES build already emitted.
export default defineConfig(({ mode }) => {
  const iife = mode === 'iife';
  return {
    publicDir: false,
    base: './', // font URLs relative to ds.css, so it works from any page origin
    build: {
      outDir: 'dist/v1',
      emptyOutDir: !iife,
      target: 'es2022',
      rollupOptions: {
        input: { ds: iife ? 'src/ds.ts' : 'src/index.ts' },
        preserveEntrySignatures: 'exports-only',
        output: iife
          ? { format: 'iife', name: 'DS', entryFileNames: 'ds.iife.js' }
          : {
              format: 'es',
              entryFileNames: 'ds.js',
              assetFileNames: (info) => (info.names[0]?.endsWith('.css') ? 'ds.css' : 'fonts/[name]-[hash][extname]'),
            },
      },
    },
  };
});
