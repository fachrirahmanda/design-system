import { defineConfig } from 'vite';

// Docs site. The library itself is built by vite.lib.config.ts into dist/v1/.
export default defineConfig({
  server: { port: 5174, strictPort: true },
  build: { target: 'es2022' },
  plugins: [
    {
      // Serve the library at its production paths in dev, so apps can point
      // VITE_DS_URL at http://localhost:5174/v1 while working on both.
      name: 'ds-cdn-paths',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url?.startsWith('/v1/ds.css')) req.url = '/src/ds.css?direct';
          else if (req.url?.startsWith('/v1/ds.js')) req.url = '/src/ds.ts';
          next();
        });
      },
    },
  ],
});
