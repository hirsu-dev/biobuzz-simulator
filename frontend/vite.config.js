import {defineConfig} from 'vite';
import {resolve} from 'node:path';
export default defineConfig({root:resolve('frontend'),base:'./',build:{outDir:'web-dist',emptyOutDir:true}});
