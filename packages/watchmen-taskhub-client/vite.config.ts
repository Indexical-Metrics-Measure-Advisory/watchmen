import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '::',
    port: 8083,
    proxy: {
      '/watchmen/taskhub': {
        target: 'http://localhost:8820',
        changeOrigin: true,
        rewrite: (value) => value.replace(/^\/watchmen/, '')
      },
      '/watchmen/auth': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (value) => value.replace(/^\/watchmen/, '')
      },
      '/watchmen/login': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (value) => value.replace(/^\/watchmen/, '')
      },
      '/watchmen/token': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (value) => value.replace(/^\/watchmen/, '')
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src')
    }
  }
});
