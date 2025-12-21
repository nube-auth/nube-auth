import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:3004',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/v1'),
      },
    },
  },
  define: {
    'import.meta.env.VITE_CORE_URL': JSON.stringify(process.env.VITE_CORE_URL || 'http://localhost:3003'),
  },
});
