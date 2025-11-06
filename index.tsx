// index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { QueryClient, QueryClientProvider,QueryObserverOptions } from '@tanstack/react-query';
import { Analytics } from "@vercel/analytics/react";// 导入 Analytics 组件
import { SpeedInsights } from "@vercel/speed-insights/react"; // 导入 SpeedInsights 组件
// 创建一个 QueryClient 实例
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 30, // 30 minutes
      retry: 1,
    },
  },
});


const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// 渲染组件
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Analytics /> {/* 添加 Analytics 组件 */}
      <SpeedInsights /> {/* 保留 SpeedInsights 组件 */}
    </QueryClientProvider>
  </React.StrictMode>
);
