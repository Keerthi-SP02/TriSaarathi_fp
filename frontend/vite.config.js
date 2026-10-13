import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsxInJsPlugin = () => ({
  name: 'jsx-in-js',
  enforce: 'pre',
  transform(code, id) {
    if (id.endsWith('.js') && !id.includes('node_modules')) {
      const result = esbuild.transformSync(code, {
        loader: 'jsx',
        sourcefile: id,
        jsx: 'automatic',
      });
      return {
        code: result.code,
        map: result.map,
      };
    }
  },
});

export default defineConfig(() => {
  const apiProxyTarget = process.env.API_PROXY_TARGET || 'http://localhost:4000';
  return {
    root: path.resolve(__dirname, '..'),
    publicDir: path.resolve(__dirname, 'public'),
    plugins: [
      jsxInJsPlugin(),
      react(),
      tailwindcss(),
    ],
    optimizeDeps: {
      noDiscovery: true,
      include: [
        'react',
        'react-dom/client',
        'lucide-react',
        'leaflet',
        'react-leaflet',
        '@react-leaflet/core',
      ],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api': apiProxyTarget,
      },
    },
  };
});
