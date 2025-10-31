# API服务模块重构方案

## 当前问题分析

目前，所有API调用都集中在`services/api.ts`文件中，而`App.tsx`直接导入并使用这些函数。这种设计导致以下问题：

1. **代码耦合度高**：组件直接依赖具体API实现细节
2. **可维护性差**：当API变更时，需要修改多个地方
3. **测试困难**：难以对API调用进行单元测试
4. **复用性低**：其他组件无法方便地重用API逻辑

## 重构方案

### 1. 创建独立的API服务模块

我们将创建专门的API服务模块，将不同功能的API调用分组管理。

#### 目录结构

```
src/
├── services/
│   ├── api/
│   │   ├── index.ts          # 统一导出
│   │   ├── articleService.ts   # 文章相关API
│   │   ├── articleStateService.ts # 文章状态相关API
│   │   ├── filterService.ts    # 过滤器相关API
│   │   └── types.ts           # API相关的类型定义
│   └── index.ts              # 服务层统一入口
```

#### 实现示例

##### articleService.ts
```typescript
import { Article, CleanArticleContent, Filter } from '../types';

export const getCleanArticleContent = async (article: Article): Promise<CleanArticleContent> => {
  try {
    const response = await fetch('/api/articles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ articleId: article.id }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Article content API error:', response.status, errorText);
      throw new Error(`Failed to fetch article content from backend: ${response.status} ${errorText}`);
    }
    return await response.json();
  } catch (e) {
    console.error("Failed to fetch article content:", e);
    return {
      title: article.title,
      source: article.sourceName,
      content: `<h3>无法加载文章内容</h3><p>获取文章内容时出错。请尝试直接访问原文链接。</p><p><a href="${article.link}" target="_blank" rel="noopener noreferrer">点击此处查看原文</a></p>`
    };
  }
};

export const getArticlesByLabel = async (filter: Filter): Promise<Article[]> => {
  try {
    const response = await fetch(`/api/articles-categories-tags?name=${encodeURIComponent(filter.value)}`);
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch articles for ${filter.type} ${filter.value}, falling back to mock data:`, error);
    return []; // Fallback to empty array on error
  }
};

export const getStarredArticles = async (): Promise<Article[]> => {
  try {
    const response = await fetch(`/api/starred`);
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch starred articles, falling back to mock data:`, error);
    return []; // Fallback to empty array on error
  }
};
```

##### articleStateService.ts
```typescript
import { Article } from '../types';

export const getArticleStates = async (articleIds: (string | number)[]): Promise<{ [key: string | number]: string[] }> => {
  if (!articleIds || articleIds.length === 0) {
    return {};
  }
  
  try {
    const response = await fetch('/api/article-states', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ articleIds }),
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch article states:', error);
    // 出错时返回空状态
    const states: { [key: string | number]: string[] } = {};
    articleIds.forEach(id => {
      states[id] = []; // 默认为空标签
    });
    return states;
  }
};

export const editArticleState = async (articleId: string | number, action: 'star' | 'read', isAdding: boolean): Promise<void> => {
  try {
    // Use the unified update-state API which supports both state changes and custom tags
    const response = await fetch('/api/update-state', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ articleId, action, isAdding }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update article state');
    }
    // No need to return anything on success, the caller can handle UI updates.
  } catch (error) {
    console.error(`Failed to edit article state for ${articleId}:`, error);
    // Re-throw the error so the UI layer can catch it and display a notification if needed.
    throw error;
  }
};

export const editArticleTag = async (articleId: string | number, tagsToAdd: string[], tagsToRemove: string[]): Promise<void> => {
  try {
    // tagsToAdd and tagsToRemove are already in full format (e.g., 'user/1000/label/AI')
    // Convert them to the FreshRSS format: 'user/-/label/{name}'
    const formatTag = (tag: string): string => {
      // If already in proper format, just replace user ID with user/-
      if (tag.startsWith('user/')) {
        return tag.replace(/^user\/\d+\//, 'user/-/');
      }
      // If it's just a label name, add the full prefix
      return `user/-/label/${encodeURIComponent(tag)}`;
    };
    
    const formattedTagsToAdd = tagsToAdd.map(formatTag);
    const formattedTagsToRemove = tagsToRemove.map(formatTag);
    
    const response = await fetch('/api/update-state', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        articleId,
        tagsToAdd: formattedTagsToAdd,
        tagsToRemove: formattedTagsToRemove
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update article tags');
    }
    
    console.log(`Successfully updated tags for ${articleId}: add [${tagsToAdd.join(', ')}] remove [${tagsToRemove.join(', ')}]`);
    
    // 显示成功提示
    if (typeof window !== 'undefined' && (tagsToAdd.length > 0 || tagsToRemove.length > 0)) {
      // Extract tag labels from full tag IDs (e.g., 'user/1000/label/AI' -> 'AI')
      const extractLabel = (tag: string) => {
        const parts = tag.split('/');
        return parts[parts.length - 1] || tag;
      };
      
      const addedLabels = tagsToAdd.map(extractLabel).join(', ');
      const removedLabels = tagsToRemove.map(extractLabel).join(', ');
      
      const message = tagsToAdd.length > 0 
        ? `成功添加标签: ${addedLabels}` 
        : `成功移除标签: ${removedLabels}`;
      
      // 使用简单的提示或现有的通知系统
      const toast = document.createElement('div');
      toast.textContent = message;
      toast.style.position = 'fixed';
      toast.style.bottom = '20px';
      toast.style.right = '20px';
      toast.style.backgroundColor = '#4CAF50';
      toast.style.color = 'white';
      toast.style.padding = '10px 20px';
      toast.style.borderRadius = '4px';
      toast.style.zIndex = '1000';
      toast.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
      document.body.appendChild(toast);
      
      // 3秒后自动消失
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s';
        setTimeout(() => document.body.removeChild(toast), 500);
      }, 3000);
    }
  } catch (error) {
    console.error(`Failed to edit article tags for ${articleId}:`, error);
    throw error;
  }
};
```

##### filterService.ts
```typescript
import { AvailableFilters } from '../types';

export const getAvailableDates = async (): Promise<string[]> => {
  try {
    const response = await fetch('/api/get-available-dates');
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch available dates:', error);
    return [];
  }
};

export const getAvailableFilters = async (): Promise<AvailableFilters> => {
  try {
    const response = await fetch('/api/list-categories-tags');
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    const data = await response.json();
    if (!data.categories || !data.tags) {
      throw new Error('Invalid data format from /api/list-categories-tags');
    }
    return data;
  } catch (error) {
    console.error("Failed to fetch available filters, falling back to mock data:", error);
    
    // Fallback to mock data on error
    const categories = new Set<string>();
    // MOCK_TAGS would need to be imported or defined here
    // For now, we'll return empty arrays
    const tags = [];

    return {
      categories: Array.from(categories).sort(),
      tags: tags.sort(),
    };
  }
};
```

### 2. 更新App.tsx中的API调用

重构后，App.tsx中的API调用应该更加简洁，例如：

```typescript
// 重构前
const articles = await getArticlesByLabel(filter);

// 重构后
import { getArticlesByLabel } from '../services/api/articleService';
const articles = await getArticlesByLabel(filter);
```

### 3. 状态管理抽象

为了进一步简化组件，可以将状态管理逻辑抽象到自定义Hook中：

```typescript
// hooks/useArticleState.ts
import { useState, useCallback } from 'react';
import { editArticleState, editArticleTag } from '../services/api/articleStateService';

export const useArticleState = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  
  const updateArticleState = useCallback(async (articleId: string, action: 'star' | 'read', isAdding: boolean) => {
    setIsUpdating(true);
    try {
      await editArticleState(articleId, action, isAdding);
    } finally {
      setIsUpdating(false);
    }
  }, []);
  
  const updateArticleTag = useCallback(async (articleId: string, tagsToAdd: string[], tagsToRemove: string[]) => {
    setIsUpdating(true);
    try {
      await editArticleTag(articleId, tagsToAdd, tagsToRemove);
    } finally {
      setIsUpdating(false);
    }
  }, []);
  
  return { isUpdating, updateArticleState, updateArticleTag };
};
```

这样，App.tsx中的状态更新逻辑会变得更加清晰和可维护。