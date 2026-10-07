import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {resolve} from 'node:path';
export default defineConfig({root:'web',base:'/melecgest/',publicDir:resolve('public'),plugins:[react()],build:{outDir:resolve('docs'),emptyOutDir:true}});
