// vite.config.ts

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',

      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-cache',
              cacheableResponse: {
                statuses: [200],
              },
            },
          },
        ],
      },

      // --- 【核心修改】 ---
      // 移除手写的 manifest.icons，改用 includeAssets 和 manifest.icons 自动生成
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        short_name: 'Briefing Hub',
        name: 'Personal RSS Briefing Hub',
        start_url: '.',
        display: 'standalone',
        theme_color: '#f9fafb',
        background_color: '#ffffff',
        // 【改】插件会自动根据下面的 icons 配置和 public 目录中的源文件生成 manifest 图标
        icons: [
          {
            // 告诉插件你的源图标是什么
            src: '/computer_cat.jpg', // 确保 public/1.jpg 存在且至少 512x512
            // 告诉插件你需要生成哪些尺寸
            sizes: [64, 96, 128, 192, 256, 512],
            // 告诉插件文件类型
            type: 'image/jpeg',
          }
        ]
      },
    }),
  ],
});