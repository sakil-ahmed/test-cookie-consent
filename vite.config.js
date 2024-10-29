import { defineConfig } from 'vite';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import { resolve } from 'path';
import fs from 'fs';

// Check if there's a cookie-consent.ts file in the src directory root
const rootMainFile = fs.existsSync(resolve(__dirname, 'src/cookie-consent.ts'))
    ? { root: resolve(__dirname, 'src/cookie-consent.ts') }
    : {};

// Gather versioned folders in src directory
const versionFolders = fs
    .readdirSync(resolve(__dirname, 'src'), { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

export default defineConfig({
    plugins: [cssInjectedByJsPlugin()],
    build: {
        target: 'es2015',
        rollupOptions: {
            // Combine root main file (if it exists) with versioned folders as inputs
            input: {
                ...rootMainFile,
                ...Object.fromEntries(
                    versionFolders.map((version) => [
                        version,
                        resolve(__dirname, `src/${version}/cookie-consent.ts`)
                    ])
                )
            },
            output: {
                entryFileNames: ({ name }) => (name === 'root' ? 'cookie-consent.js' : `${name}/cookie-consent.js`),
                manualChunks: undefined,
                dir: resolve(__dirname, 'dist')
            }
        },
        sourcemap: false,
        minify: 'terser'
    }
});
