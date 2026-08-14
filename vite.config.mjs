// defineConfig comes from vitest/config, not vite: it is what makes the `test` block below be read.
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],

    // Express serves `build/`, both in the Dockerfile and in server.js. Keeping Vite's output there means the
    // production plumbing is untouched by the move off react-scripts.
    build: {
        outDir: 'build',
    },

    server: {
        port: 3000,
        // Vite binds 127.0.0.1 by default, react-scripts bound 0.0.0.0. Without this the dev server is unreachable
        // from outside the container in docker-compose.dev.yml, published port or not.
        host: true,
        // Replaces the "proxy" field react-scripts read from package.json. Same target: server-proxy-only.js on 8080,
        // which is what rewrites /api into /gold/api on the backend.
        proxy: {
            '/api': 'http://localhost:8080',
        },
    },

    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: './src/setupTests.js',
    },
});
