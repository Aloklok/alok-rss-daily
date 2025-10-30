import { Article, BriefingReport, Tag, CleanArticleContent, AvailableFilters, Filter } from '../types';

// --- Mock Data Store (only MOCK_TAGS remains for now) ---
let MOCK_TAGS: Tag[] = [
    { id: 'user/1000/label/framework', label: 'Framework' },
    { id: 'user/1000/label/ai', label: 'AI' },
    { id: 'user/1000/label/performance', label: 'Performance' },
];

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to get today's date in Asia/Shanghai as YYYY-MM-DD
export const getTodayInShanghai = () => {
    const todayInShanghai = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', { // en-CA for YYYY-MM-DD format
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'Asia/Shanghai'
    });
    return formatter.format(todayInShanghai);
};

// --- API Functions using Supabase and FreshRSS backend ---

export const getAvailableDates = async (): Promise<string[]> => {
    try {
        const response = await fetch('/api/get-available-dates');
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        const dates = await response.json();
        // The backend already returns sorted, unique dates.
        return dates;
    } catch (error) {
        console.error('Failed to fetch available dates from backend:', error);
        return []; // Fallback to an empty array on error
    }
};

type TimeSlot = 'morning' | 'afternoon' | 'evening';

export const getBriefingReportsByDate = async (date: string, slot?: TimeSlot): Promise<BriefingReport[]> => {
    try {
        const url = new URL('/api/get-briefings', window.location.origin);
        url.searchParams.append('date', date);
        if (slot) {
            url.searchParams.append('slot', slot);
        }

        const response = await fetch(url.toString());
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data: GroupedArticles = await response.json();

        // Check if the returned object is empty or contains no articles
        if (!data || Object.values(data).every(arr => arr.length === 0)) {
            return [];
        }

        const reportTitle = date === 'today' ? '今日简报' : `${new Date(date).toLocaleString('zh-CN', { month: 'long', day: 'numeric' })}简报`;

        const singleReport: BriefingReport = {
            id: 1, // A fixed ID for the main report
            title: reportTitle,
            articles: data, // The data from the API is now the grouped articles object
        };

        return [singleReport];
    } catch (error) {
        console.error(`Failed to fetch briefing reports from backend:`, error);
        return []; // Fallback to empty array on error
    }
};

export const markAllAsRead = async (): Promise<void> => {
    // This function would ideally update Supabase, but for now, it's a placeholder.
    await sleep(1000);
    console.log("Marking all articles as read (placeholder).");
};

export const getCleanArticleContent = async (article: Article): Promise<CleanArticleContent> => {
    try {
        const endpoint = '/api/articles';
        const requestBody = { id: article.id };
        // Debug: show the endpoint and payload used for fetching article content via FreshRSS API
        console.log('getCleanArticleContent → POST', endpoint, 'payload:', requestBody);

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
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

export const getTags = async (): Promise<Tag[]> => {
    // This function would ideally fetch tags from Supabase or FreshRSS, but for now, it's a placeholder.
    await sleep(200);
    console.log("Fetching tags (placeholder).");
    return MOCK_TAGS;
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
        MOCK_TAGS.forEach(a => categories.add(a.label)); // Use MOCK_TAGS for fallback
        const tags = MOCK_TAGS.map(t => t.label);

        return {
            categories: Array.from(categories).sort(),
            tags: tags.sort(),
        };
    }
};