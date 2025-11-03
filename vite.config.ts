// vite.config.ts

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 1. 基本配置
      registerType: 'autoUpdate', // 自动更新 Service Worker
      injectRegister: 'auto', // 自动注入注册脚本

      // 2. 缓存策略 (Workbox)
      workbox: {
        // 动态缓存所有构建出的静态资源 (JS, CSS, fonts, etc.)
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg}'],
        
        // Stale-While-Revalidate 策略用于 API 请求
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-cache',
              cacheableResponse: {
                statuses: [200], // 只缓存成功的 GET 请求
              },
            },
          },
        ],
      },

      // 3. Manifest 配置
      manifest: {
        short_name: 'Briefing Hub',
        name: 'Personal RSS Briefing Hub',
        start_url: '.',
        display: 'standalone',
        theme_color: '#f9fafb',
        background_color: '#ffffff',
        icons: [
            {
          "src": "/1.jpg",
          "type": "image/jpeg",
          "sizes": "442x433"
        }
        ],
      },
    }),
  ],
});