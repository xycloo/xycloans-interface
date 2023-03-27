import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import GlobalPolyFill from "@esbuild-plugins/node-globals-polyfill";
import { resolve } from "path";



export default defineConfig({
    plugins: [sveltekit()],
    optimizeDeps: {
        esbuildOptions: {
            define: {
                global: "globalThis",
            },
            plugins: [
                GlobalPolyFill.NodeGlobalsPolyfillPlugin({
                    process: true,
                    buffer: true,
                }),
            ],
        },
    },
    resolve: {
        alias: {
            process: "process/browser",
            stream: "stream-browserify",
            zlib: "browserify-zlib",
            util: "util",
        },
    },
});
