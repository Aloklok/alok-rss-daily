# Briefing Hub 项目文档

## 项目概述

Briefing Hub 是一个基于 React 和 TypeScript 构建的应用程序，使用 Supabase 和 FreshRSS 作为后端服务。它提供了一个简洁的界面来浏览每日简报、文章分类和标签管理等功能。

## 开发命令

- `vercel dev` - 启动开发服务器 (在 Vercel 环境下)
- `npm run build` - 构建生产版本
- `npm run lint` - 运行 ESLint 检查
- `npm run preview` - 预览构建版本

## 环境变量

- `VITE_SUPABASE_URL` - Supabase 项目 URL
- `VITE_SUPABASE_ANON_KEY` - Supabase 匿名密钥
- `SUPABASE_URL` - Supabase 项目 URL (用于 Vercel Serverless Functions)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase 服务角色密钥 (用于 Vercel Serverless Functions)
- `FRESHRSS_API_URL` - FreshRSS API 基础 URL (用于 Vercel Serverless Functions)
- `FRESHRSS_AUTH_TOKEN` - FreshRSS 认证令牌 (用于 Vercel Serverless Functions)

## 技术栈

- **前端**: React, TypeScript, Vite (构建工具), Tailwind CSS (样式框架)
- **后端**: Vercel Serverless Functions (API), Supabase (数据库/认证), FreshRSS (RSS 服务)

## 前端架构

项目采用现代 React 架构，通过自定义 Hooks 将业务逻辑与 UI 组件分离，实现了高度的模块化和可维护性。

### 核心目录结构
- **`components/`**: 存放所有 UI 组件。复杂的组件（如 `Briefing` 和 `Sidebar`）已拆分为更小的、可复用的子组件（如 `ArticleCard`, `ArticleGroup`）。
- **`hooks/`**: 存放自定义 React Hooks，用于封装和管理应用的状态和副作用。这是应用逻辑的核心。
- **`services/`**: 存放与外部 API 通信的服务模块。

### 自定义 Hooks (逻辑层)
- **`useFilters`**: 管理所有与筛选器（日期、分类、标签）相关的状态和逻辑。
- **`useDataFetching`**: 负责根据当前筛选器获取简报和文章数据，并管理加载状态。
- **`useArticleManagement`**: 封装文章状态（已读、收藏、标签）的更新逻辑。
- **`useReader`**: 管理阅读器视图（Reader View）的显示状态和内容加载。
- **`useSidebar`**: 管理侧边栏的内部状态，如标签页切换和收藏夹的加载。

### 主要组件 (UI 层)
- **`App.tsx`**: 主应用组件，非常轻量。其主要职责是组合自定义 Hooks 并渲染应用的整体布局。
- **`ArticleCard.tsx`**: 独立的可复用组件，用于显示单篇文章的详细信息。
- **`ArticleDetail.tsx`**: 显示文章的详细内容，通常在阅读器视图中使用。
- **`ArticleGroup.tsx`**: 用于显示一个文章分组（如“重要新闻”）。
- **`ArticleList.tsx`**: 负责渲染文章列表。
- **`ArticlePreviewModal.tsx`**: 文章预览模态框组件。
- **`Briefing.tsx`**: 简报主视图，通过 `ArticleGroup` 和 `ArticleCard` 动态渲染内容。
- **`ReaderView.tsx`**: 文章阅读器视图，提供沉浸式阅读体验。
- **`SettingsPopover.tsx`**: 应用设置的弹出框组件。
- **`Sidebar.tsx`**: 侧边栏组件，使用 `useSidebar` Hook 管理其内部状态。

## API 服务 (`services/api.ts`)

所有对后端 API 的请求都通过一个统一的服务模块进行处理。

- **集中式请求处理器**: 一个内部的 `apiService` 对象处理所有的 `fetch` 调用，统一了 URL 构建、请求头和错误处理。
- **统一的用户通知**: 服务层集成了 `showToast` 工具，可以在 API 请求成功（如更新标签）或失败时，向用户显示美观的 Toast 通知。
- **性能缓存**: `getCleanArticleContent` 函数内置了内存缓存，避免了在同一会话中对同一篇文章的重复网络请求。

## 后端 API (Vercel Serverless Functions)

后端 API 位于 `api/` 目录下，作为 Vercel Serverless Functions 部署。所有 API 端点都使用共享的 `api/_utils.ts` 模块来统一处理客户端初始化、请求处理、CORS 和错误响应。

- **`api/_utils.ts`**: 包含 `getSupabaseClient` 和 `getFreshRssClient` 用于统一初始化客户端，以及 `apiHandler` 高阶函数来封装 API 逻辑。
- **`api/article-states.ts`**: 处理文章已读/未读、收藏/取消收藏状态的更新。
- **`api/articles-categories-tags.ts`**: 提供文章的分类和标签相关数据。
- **`api/articles.ts`**: 获取文章列表和文章详情。
- **`api/get-available-dates.ts`**: 获取有文章的可用日期列表。
- **`api/get-briefings.ts`**: 获取每日简报数据。
- **`api/list-categories-tags.ts`**: 列出所有可用的分类和标签。
- **`api/starred.ts`**: 处理星标文章的逻辑。
- **`api/update-state.ts`**: 通用的文章状态更新接口。
- **模块导入**: 在 Vercel Serverless Functions 中，模块导入路径已修正为包含 `.js` 扩展名（例如 `import ... from './_utils.js';`），以确保在 Node.js 运行时环境中正确解析。

## 关键数据流

Briefing Hub 的数据流设计旨在实现清晰的职责分离和高效的状态管理。以下是核心数据流的详细说明：

1.  **应用初始化与数据加载**:
    - 应用启动时，`App.tsx` 组合 `useFilters` 和 `useDataFetching` 等 Hooks。
    - `useFilters` Hook 负责初始化筛选器状态，并从后端获取可用的日期、分类和标签数据。
    - `useDataFetching` Hook 监听 `useFilters` 提供的 `activeFilter` 变化，并根据当前筛选器自动调用 `services/api.ts` 中的函数（如 `getBriefings` 或 `getArticles`）来获取简报或文章列表数据。
    - 数据获取过程中，`useDataFetching` 管理加载状态，并在数据返回后更新其内部状态，从而触发 `Briefing.tsx` 或 `ArticleList.tsx` 等 UI 组件的重新渲染。

2.  **用户交互与状态更新**:
    - **筛选器操作**: 用户在 `Sidebar.tsx` 或其他筛选组件中选择日期、分类或标签时，会调用 `useFilters` Hook 中暴露的 `handleFilterChange` 函数。
    - `handleFilterChange` 更新 `activeFilter` 状态，这会触发 `useDataFetching` 重新获取数据。
    - **文章状态管理**: 用户在 `ArticleCard.tsx` 或 `ArticleDetail.tsx` 中进行“已读/未读”、“收藏/取消收藏”等操作时，会调用 `useArticleManagement` Hook 中暴露的函数（如 `markArticleAsRead`, `toggleStarred`）。
    - 这些函数会通过 `services/api.ts` 调用相应的后端 API (例如 `api/update-state.ts` 或 `api/starred.ts`) 来更新数据库中的文章状态。
    - API 请求成功后，`useArticleManagement` 会更新本地状态，并可能触发相关 UI 组件的重新渲染。
    - **阅读器视图**: 当用户点击文章进入阅读器视图时，`useReader` Hook 会管理阅读器模态框的显示状态，并调用 `services/api.ts` 中的 `getCleanArticleContent` 函数来获取文章的纯净内容。该函数利用缓存机制优化性能。

3.  **API 服务层 (`services/api.ts`)**:
    - 作为前端与后端之间的桥梁，统一处理所有 API 请求的发送、响应解析和错误处理。
    - 集成了 `showToast` 通知机制，为用户提供实时的操作反馈。
    - 内部缓存机制减少重复数据请求。

4.  **后端 API (Vercel Serverless Functions)**:
    - 接收前端请求，通过 `api/_utils.ts` 进行统一的客户端初始化和请求处理。
    - 根据不同的 API 端点（如 `api/get-briefings.ts`, `api/update-state.ts`），与 Supabase 数据库或 FreshRSS API 进行交互，执行数据查询、更新等操作。
    - 返回处理结果给前端。

## 部署

Briefing Hub 项目推荐部署在 Vercel 平台，因为它原生支持 Serverless Functions 和前端应用的集成部署。

### 部署步骤

1.  **Vercel CLI 安装**: 如果尚未安装 Vercel CLI，请通过 npm 安装：
    ```bash
    npm install -g vercel
    ```
2.  **登录 Vercel**: 在项目根目录运行以下命令并按照提示完成登录：
    ```bash
    vercel login
    ```
3.  **链接项目**: 将本地项目链接到 Vercel 上的一个新项目或现有项目：
    ```bash
    vercel link
    ```
4.  **设置环境变量**: 在 Vercel 项目设置中配置所有必要的环境变量（`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FRESHRSS_API_URL`, `FRESHRSS_AUTH_TOKEN`）。确保为 Serverless Functions 配置正确的 `SUPABASE_SERVICE_ROLE_KEY` 和 `FRESHRSS_AUTH_TOKEN`。
5.  **部署**: 运行以下命令进行部署：
    ```bash
    vercel
    ```
    或者，如果您想在部署后自动打开浏览器预览，可以使用：
    ```bash
    vercel --prod
    ```
    这将把您的应用部署到生产环境。

### 持续集成/持续部署 (CI/CD)

- 推荐将项目与 Git 仓库（如 GitHub, GitLab, Bitbucket）关联，Vercel 会自动配置 CI/CD，每次代码推送到主分支时都会触发自动部署。