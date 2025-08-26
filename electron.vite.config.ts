import { resolve } from 'path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import 'dotenv/config';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    define: {
      'process.env': process.env
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react(), tailwindcss()],
    optimizeDeps: {
      include: ['monaco-editor', 'monaco-sql-languages']
    }
  }
});
