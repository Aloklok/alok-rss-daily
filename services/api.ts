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
        
        const data: Article[] = await response.json();

        if (!data || data.length === 0) return [];

        // The backend now returns the articles directly. The frontend's responsibility is to group them for display.
        const reportTitle = date === 'today' ? '今日简报' : `${new Date(date).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}简报`;

        const singleReport: BriefingReport = {
            id: 1, // A fixed ID for the main report
            title: reportTitle,
            articles: data, // The data from the API is already sorted
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
    // This function would ideally fetch states from Supabase or FreshRSS, but for now, it's a placeholder.
    await sleep(200);
    const states: { [key: string | number]: string[] } = {};
    articleIds.forEach(id => {
        states[id] = []; // Default to empty tags
    });
    console.log("Fetching article states (placeholder).");
    return states;
};

export const editArticleState = async (articleId: string | number, action: 'star' | 'read', isAdding: boolean): Promise<void> => {
    try {
        const response = await fetch('/api/edit-article-state', {
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
    // This function would ideally update Supabase or FreshRSS, but for now, it's a placeholder.
    await sleep(500);
    console.log(`Updating tags for ${articleId} (placeholder): add [${tagsToAdd.join(', ')}] remove [${tagsToRemove.join(', ')}]`);
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