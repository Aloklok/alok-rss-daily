import { Article, BriefingReport, Tag, CleanArticleContent, AvailableFilters, Filter } from '../types';

// --- Reusable Toast Notification Utility ---
const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    if (typeof window === 'undefined') return;

    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.backgroundColor = type === 'success' ? '#4CAF50' : '#F44336';
    toast.style.color = 'white';
    toast.style.padding = '12px 24px';
    toast.style.borderRadius = '6px';
    toast.style.zIndex = '1001';
    toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out';
    toast.style.transform = 'translateY(20px)';
    
    document.body.appendChild(toast);

    // Animate in
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 10);

    // Animate out and remove
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
};


// --- Centralized API Service ---
interface RequestOptions extends RequestInit {
    params?: Record<string, string>;
}

const apiService = {
    async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
        const url = new URL(endpoint, window.location.origin);
        if (options.params) {
            Object.entries(options.params).forEach(([key, value]) => {
                url.searchParams.append(key, value);
            });
        }

        const config: RequestInit = {
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        };

        if (options.body) {
            config.body = JSON.stringify(options.body);
        }

        try {
            const response = await fetch(url.toString(), config);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `API request failed with status ${response.status}` }));
                throw new Error(errorData.message);
            }
            return await response.json();
        } catch (error) {
            console.error(`API request to ${endpoint} failed:`, error);
            showToast(error instanceof Error ? error.message : 'An unknown error occurred.', 'error');
            throw error;
        }
    },
};

// --- Helper for Shanghai Timezone ---
export const getTodayInShanghai = (): string => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Shanghai'
    });
    return formatter.format(new Date());
};

// --- Refactored API Functions ---

export const getAvailableDates = (): Promise<string[]> => {
    return apiService.request<string[]>('/api/get-available-dates').catch(() => []);
};

export const getBriefingReportsByDate = async (date: string, slot?: 'morning' | 'afternoon' | 'evening'): Promise<BriefingReport[]> => {
    const params: Record<string, string> = { date };
    if (slot) params.slot = slot;

    try {
        const data = await apiService.request<GroupedArticles>('/api/get-briefings', { params });
        if (!data || Object.values(data).every(arr => arr.length === 0)) return [];
        
        const reportTitle = `${new Date(date).toLocaleString('zh-CN', { month: 'long', day: 'numeric' })}简报`;
        return [{ id: 1, title: reportTitle, articles: data }];
    } catch {
        return [];
    }
};

export const markAllAsRead = (articleIds: (string | number)[]): Promise<void> => {
    if (!articleIds || articleIds.length === 0) return Promise.resolve();
    return apiService.request<void>('/api/update-state', {
        method: 'POST',
        body: { articleIds, action: 'read', isAdding: true },
    });
};

// --- Article Content Cache ---
const articleCache = new Map<string | number, CleanArticleContent>();

export const getCleanArticleContent = async (article: Article): Promise<CleanArticleContent> => {
    if (articleCache.has(article.id)) {
        return articleCache.get(article.id)!;
    }
    try {
        const content = await apiService.request<CleanArticleContent>('/api/articles', {
            method: 'POST',
            body: { id: article.id },
        });
        articleCache.set(article.id, content);
        return content;
    } catch {
        return {
            title: article.title,
            source: article.sourceName,
            content: `<h3>无法加载文章内容</h3><p>获取文章内容时出错。请尝试直接访问原文链接。</p><p><a href="${article.link}" target="_blank" rel="noopener noreferrer">点击此处查看原文</a></p>`,
        };
    }
};

export const getArticleStates = (articleIds: (string | number)[]): Promise<{ [key: string]: string[] }> => {
    if (!articleIds || articleIds.length === 0) return Promise.resolve({});
    return apiService.request<{ [key: string]: string[] }>('/api/article-states', {
        method: 'POST',
        body: { articleIds },
    }).catch(() => {
        const states: { [key: string]: string[] } = {};
        articleIds.forEach(id => { states[String(id)] = []; });
        return states;
    });
};

export const editArticleState = (articleId: string | number, action: 'star' | 'read', isAdding: boolean): Promise<void> => {
    return apiService.request<void>('/api/update-state', {
        method: 'POST',
        body: { articleId, action, isAdding },
    });
};

export const editArticleTag = async (articleId: string | number, tagsToAdd: string[], tagsToRemove: string[]): Promise<void> => {
    const formatTag = (tag: string) => tag.startsWith('user/') ? tag.replace(/^user\/\d+\//, 'user/-/') : `user/-/label/${encodeURIComponent(tag)}`;
    
    await apiService.request<void>('/api/update-state', {
        method: 'POST',
        body: {
            articleId,
            tagsToAdd: tagsToAdd.map(formatTag),
            tagsToRemove: tagsToRemove.map(formatTag),
        },
    });

    if (tagsToAdd.length > 0 || tagsToRemove.length > 0) {
        const extractLabel = (tag: string) => tag.split('/').pop() || tag;
        const added = tagsToAdd.map(extractLabel).join(', ');
        const removed = tagsToRemove.map(extractLabel).join(', ');
        const message = tagsToAdd.length > 0 ? `成功添加标签: ${added}` : `成功移除标签: ${removed}`;
        showToast(message, 'success');
    }
};

export const getArticlesByLabel = (filter: Filter): Promise<Article[]> => {
    return apiService.request<Article[]>('/api/articles-categories-tags', {
        params: { name: filter.value },
    }).catch(() => []);
};

export const getStarredArticles = (): Promise<Article[]> => {
    return apiService.request<Article[]>('/api/starred').catch(() => []);
};

export const getAvailableFilters = (): Promise<AvailableFilters> => {
    return apiService.request<AvailableFilters>('/api/list-categories-tags').catch(() => ({ categories: [], tags: [] }));
};

// Mock function, remains unchanged
export const getTags = async (): Promise<Tag[]> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return [
        { id: 'user/1000/label/framework', label: 'Framework' },
        { id: 'user/1000/label/ai', label: 'AI' },
        { id: 'user/1000/label/performance', label: 'Performance' },
    ];
};
