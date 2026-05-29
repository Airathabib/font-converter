import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const isDev = process.env.NODE_ENV !== 'production';

export default defineConfig({
  plugins: [react()],

  base: isDev ? '/' : './',

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    port: 5173,
    host: true,
    strictPort: true,
    cors: true,
    allowedHosts: true,
  },

  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',

        silenceDeprecations: ['import', 'global-builtin'],
      },
    },
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,

    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
    },
  },
});
