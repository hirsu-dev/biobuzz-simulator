import {defineConfig} from 'vite';
import {resolve} from 'node:path';
export default defineConfig({root:resolve('frontend'),esbuild:{legalComments:'inline'},base:'./',build:{outDir:'web-dist',emptyOutDir:true,rollupOptions:{output:{banner:"/*! DSIM adaptations: Required Notice: Copyright 2026 Dohun Kim (https://github.com/genius0412). PolyForm Noncommercial 1.0.0: https://polyformproject.org/licenses/noncommercial/1.0.0 */"}}}});
