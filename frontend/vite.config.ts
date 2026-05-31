import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import path from 'path';

const isDev = process.env.NODE_ENV !== 'production';

export default defineConfig({
	plugins: [
		react(),
		electron([
			{
				entry: 'electron/main.ts',

				vite: {
					build: {
						outDir: 'dist-electron',
						rollupOptions: {
							external: [
								'electron',
								'ttf2woff',
								'ttf2woff2',
								'favicons',
								'sharp',
								'sharp-ico',
								'adm-zip',
								'express',
								'cors',
								'multer'
							]
						}
					}
				}
			},
			{
				entry: 'electron/preload.ts',
				vite: {
					build: {
						outDir: 'dist-electron',
						rollupOptions: {
							external: ['electron']
						}
					}
				}
			}
		])
	],

	base: isDev ? '/' : './',

	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src')
		}
	},

	server: {
		port: 5173,
		host: 'localhost',
		strictPort: false,
		cors: true
	},

	css: {
		preprocessorOptions: {
			scss: {
				api: 'modern-compiler',
				silenceDeprecations: ['import', 'global-builtin']
			}
		}
	},

	build: {
		outDir: 'dist',
		emptyOutDir: true,
		sourcemap: false,
		rollupOptions: {
			input: {
				main: path.resolve(__dirname, 'index.html')
			}
		}
	}
});
