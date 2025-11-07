// vite.config.ts

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 1. 基本 PWA 配置
      registerType: 'autoUpdate',
      injectRegister: 'auto',

      // 2. Workbox 缓存策略 (保持不变)
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

      // 3. Web App Manifest 的基本信息
      manifest: {
        short_name: 'Briefing Hub',
        name: 'Personal RSS Briefing Hub',
        start_url: '.',
        display: 'standalone',
        theme_color: '#f9fafb',
        background_color: '#ffffff',
        // 【重要】我们在这里留一个空的 icons 数组，
        // 或者完全删除 icons 字段。
        // 插件会自动用 pwaAssets 生成的内容来填充它。
        icons: [], 
      },

      // --- 4. 【核心修改】启用并配置 PWA 资产生成器 ---
      pwaAssets: {
        // 告诉插件你的源图标是什么。
        // 确保 'public/1.jpg' 存在，并且最好是 512x512 或更大的正方形。
        image: 'public/computer_cat.jpeg',
        
        // 使用一个预设来自动生成所有推荐的图标和 HTML 头部链接。
        // 'minimal-2023' 是当前的最佳实践。
        preset: 'minimal-2023',
      }
    }),
  ],
});