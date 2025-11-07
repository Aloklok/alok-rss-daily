// index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; // 【改】移除未使用的 QueryObserverOptions
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

// 创建一个 QueryClient 实例 (保持不变)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 10, // 10 minutes
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

// --- 【核心修复】开始 ---

// 将你的应用主体（包括所有 providers）封装在一个组件中，以便复用
const AppWithProviders: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <App />
    <Analytics />
    <SpeedInsights />
  </QueryClientProvider>
);

// 使用 Vite 提供的环境变量 import.meta.env.DEV 来进行条件渲染
// 在开发环境 (vercel dev)，DEV 为 true，启用严格模式
// 在生产环境 (build)，DEV 为 false，禁用严格模式
root.render(
  import.meta.env.DEV ? (
    <React.StrictMode>
      <AppWithProviders />
    </React.StrictMode>
  ) : (
    <AppWithProviders />
  )
);
// --- 核心修复结束 ---