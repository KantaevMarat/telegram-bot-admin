import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    strictPort: true,
    // Разрешить все хосты для туннелей (serveo, ngrok, etc.)
    allowedHosts: ['.serveo.net', '.ngrok.io', '.loca.lt', '.trycloudflare.com', 'localhost'],
  },
  // Отключить TypeScript проверку полностью
  esbuild: {
    ignoreAnnotations: true,
  },
  build: {
    // Отключить TypeScript для сборки
    rollupOptions: {
      onwarn(warning, warn) {
        // Игнорировать все предупреждения
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE' ||
            warning.code === 'PLUGIN_WARNING') {
          return;
        }
        warn(warning);
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
});

