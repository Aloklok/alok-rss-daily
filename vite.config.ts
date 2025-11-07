// vite.config.ts

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ command }) => {
  // 【改】将 defineConfig 的参数从一个对象变成一个函数
  // 这允许我们根据当前的命令（'serve' 对应开发，'build' 对应生产）来动态调整配置
  
  const isBuild = command === 'build';

  return {
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
        
        // 3. Web App Manifest (保持不变)
        manifest: {
          short_name: 'Briefing Hub',
          name: 'Personal RSS Briefing Hub',
          start_url: '.',
          display: 'standalone',
          theme_color: '#f9fafb',
          background_color: '#ffffff',
          icons: [
            {
              src: 'computer_cat.jpeg',
              sizes: '192x192',
              type: 'image/jpeg',
              purpose: 'any'
            },
            {
              src: 'computer_cat.jpeg',
              sizes: '512x512',
              type: 'image/jpeg',
              purpose: 'any'
            }
          ]
        },

        // --- 4. 【核心修复】在开发模式下禁用 PWA 插件 ---
        devOptions: {
          enabled: !isBuild, // 只在非构建时（即开发时）启用 dev aptions
          type: 'module',
        },
        // 【增】这个是关键：如果不是生产构建，则禁用整个 PWA 功能
        // 这会阻止 Service Worker 在开发模式下被生成或注册
        disable: !isBuild,
      }),
    ],
  };
});