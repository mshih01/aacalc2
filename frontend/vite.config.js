import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@aacalc2': path.resolve(__dirname, '../src'),
        },
    },
    server: {
        fs: {
            // allow serving files from one level up to import backend module
            allow: [path.resolve(__dirname, '..')],
        },
    },
});
//# sourceMappingURL=vite.config.js.map