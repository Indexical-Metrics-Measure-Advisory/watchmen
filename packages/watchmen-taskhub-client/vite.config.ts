import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, '');
  const appName = env.VITE_APP_NAME || 'Watchmen';
  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_APP_NAME': JSON.stringify(appName)
    },
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
  };
});
