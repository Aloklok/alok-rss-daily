好的，我们来更新 `README.md`，以准确反映这次“数据加载器”重构带来的架构优化。

这份新文档将在“前端架构”部分引入 `services/articleLoader.ts` 的概念，并更新“关键数据流”，以体现其核心作用。

---

# Briefing Hub 项目文档

## 项目概述

Briefing Hub 是一个基于 React 和 TypeScript 构建的现代化 RSS 阅读器前端，它使用 Supabase 作为文章详情的数据源，使用 FreshRSS 作为 RSS 订阅和状态管理的核心服务。应用提供了一个简洁、高效的界面来浏览每日简报、管理文章分类和标签，并支持全文阅读和渐进式 Web 应用（PWA）功能。

## 核心特性

- **统一数据视图**：无论是浏览每日简报、分类、标签还是收藏夹，所有文章数据都经过融合处理，确保信息完整一致。
- **响应式状态管理**：应用状态在所有组件间实时同步，在一个地方收藏文章，侧边栏的收藏列表会立即更新。
- **高性能数据获取**：利用缓存、后台刷新和请求优化，提供流畅、快速的浏览体验。
- **渐进式 Web 应用 (PWA)**：支持离线访问和快速加载，提供接近原生应用的体验。



## 技术栈

- **核心框架**: React, TypeScript, Vite
- **样式**: Tailwind CSS
- **状态管理**:
  - **服务器状态**: TanStack Query (React Query) - 负责管理所有与后端 API 的交互。
  - **客户端状态**: Zustand - 充当所有文章数据的“单一数据源”。
- **后端 API**: Vercel Serverless Functions
- **后端服务**:
  - **Supabase**: 提供文章的核心内容和自定义元数据。
  - **FreshRSS**: 提供 RSS 订阅管理、文章状态（已读/收藏）和标签。

## 前端架构

项目采用分层、职责清晰的现代架构模式，将数据获取、业务逻辑、状态管理和 UI 展示完全分离。

### 核心目录结构
- **`components/`**: 存放所有 UI 组件。
- **`hooks/`**: 存放与 UI 逻辑和状态管理连接相关的自定义 React Hooks。
- **`services/`**: 存放与外部世界交互的服务模块。
- **`store/`**: 存放 Zustand 全局状态管理的定义。

---

### **核心数据模型与数据源**

应用的**核心挑战与解决方案**在于融合两个独立的数据源（Supabase 和 FreshRSS），以创建一个统一的 `Article` 对象模型。

#### 1. Supabase 数据源 (`public.articles` 表)

这是文章**核心内容和分析数据**的来源，主要用于填充文章卡片和详情页。

```sql
CREATE TABLE public.articles (
  id text NOT NULL PRIMARY KEY, -- 文章ID，与 FreshRSS 中的 ID 对应
  title text,
  link text,
  sourceName text,
  published timestamptz,
  category text,                
  keywords jsonb,
  verdict jsonb,
  summary text,
  highlights text,
  critiques text,
  marketTake text,
  tldr text,
  n8n_processing_date timestamptz -- 用于按日期筛选简报
);
```

#### 2. FreshRSS 数据源

这是文章**状态和分类体系**的来源，由 FreshRSS API 提供，包含 `annotations` (状态), `categories` (分类/标签ID), `tags` (标签文本) 等字段。

#### 3. 统一的 `Article` 对象

前端通过**数据融合**，将上述两个数据源的信息合并成一个统一的 `Article` 对象，其 `tags` 数组是融合模型的集中体现，混合了多种“标签类”信息。

---

### 状态与数据流架构

#### 1. `services/api.ts` - 原始 API 层
- **职责**: 作为最底层的通信模块，只负责与后端 API 端点进行原始的 `fetch` 通信，对返回的数据不做任何处理。

#### 2. `services/articleLoader.ts` - 数据加载与融合层
- **职责**: **核心业务逻辑层**。它封装了所有复杂的数据融合过程。例如，`fetchStarredArticles` 函数会先从 `api.ts` 调用 `getStarredArticles` 获取 FreshRSS 数据，再调用 `getArticlesDetails` 获取 Supabase 数据，然后将两者合并成一个完整的 `Article` 对象数组。
- **优点**: 将业务逻辑与 React Hooks 解耦，使其变得可独立测试和复用。

#### 3. `hooks/useArticles.ts` - 服务器状态连接层 (React Query)
- **职责**: 作为连接“数据加载器”与 React 世界的桥梁。
  - **`use...Query` Hooks**: 调用 `articleLoader.ts` 中对应的 `fetch...` 函数，并将其包装在 `useQuery` 中。它们负责管理缓存、加载状态 (`isLoading`, `isFetching`)，并在数据获取成功后，调用 `articleStore` 的 action 将数据存入全局 Store。
  - **`use...Mutation` Hooks**: 负责处理所有“写”操作，内置了乐观/非乐观更新、状态回滚和用户反馈逻辑。

#### 4. `store/articleStore.ts` - 客户端状态中心 (Zustand)
- **职责**: 应用的**“单一事实来源”**。它存储了所有经过融合的、完整的文章数据 (`articlesById`) 和重要的 UI 索引（如 `starredArticleIds`），确保所有组件都能访问到一致的、最新的状态。

#### 5. `App.tsx` 与 UI 组件 - 消费与渲染层
- **职责**: `App.tsx` 从 `use...Articles` Hooks 触发数据获取，并从 `articleStore` 订阅数据。然后，它使用 `useMemo` 将 Store 中的数据重构成适合 UI 展示的格式（如 `reports`），并传递给下层的纯展示组件（如 `Briefing`, `ArticleList`）。

## 后端 API (Vercel Serverless Functions)

后端 API 位于 `api/` 目录下，作为 Vercel Serverless Functions 部署。

- **`api/_utils.ts`**: 包含 `getSupabaseClient` 和 `getFreshRssClient` 的辅助函数。
- **`api/get-briefings.ts`**: 核心数据接口。支持按 `date` 和 `slot` 查询（源: Supabase），也支持按 `articleIds` 数组查询（用于数据融合）。
- **`api/articles-categories-tags.ts`**: 获取特定分类/标签/收藏夹的文章列表（源: FreshRSS）。已优化，会合并 FreshRSS 的 `categories` 和 `annotations` 字段。
- **`api/get-article-states.ts`**: 根据文章 ID 列表，批量获取它们在 FreshRSS 中的状态。已优化，会合并 `categories` 和 `annotations`。
- **`api/list-categories-tags.ts`**: 获取所有可用的分类和标签列表，并包含文章数量 (`count`)。
- **`api/update-state.ts`**: 通用的文章状态更新接口，处理所有“写”操作。
- **`api/articles.ts`**: 获取单篇文章的“干净”内容，用于阅读器模式。
- **`api/get-available-dates.ts`**: 获取有文章的可用日期列表。

## 环境变量
- `VITE_SUPABASE_URL` - Supabase 项目 URL (用于前端客户端)
- `VITE_SUPABASE_ANON_KEY` - Supabase 匿名密钥 (用于前端客户端)
- `SUPABASE_URL` - Supabase 项目 URL (用于 Vercel Serverless Functions 后端)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase 服务角色密钥 (用于 Vercel Serverless Functions 后端)
- `FRESHRSS_API_URL` - FreshRSS API 基础 URL (用于 Vercel Serverless Functions 后端)
- `FRESHRSS_AUTH_TOKEN` - FreshRSS 认证令牌 (用于 Vercel Serverless Functions 后端)

## 开发命令

- `npm install` - 安装项目依赖
- `npm run build` - 构建生产版本
- `npm run preview` - 本地预览生产版本
- `vercel dev` - 启动开发服务器 (推荐，以模拟 Vercel 环境)
- `npm run lint` - 运行 ESLint 检查


## 部署
部署流程保持不变，推荐部署在 Vercel 平台。
- `npm install -g vercel`
- `vercel login`
- `vercel link`
- 在 Vercel 项目设置中配置所有必要的环境变量。
- `vercel --prod` 部署到生产环境。