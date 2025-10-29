import { Article, BriefingReport, Tag, CleanArticleContent, AvailableFilters, Filter } from '../types';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- Mock Data Store (only MOCK_TAGS remains for now) ---
let MOCK_TAGS: Tag[] = [
    { id: 'user/1000/label/framework', label: 'Framework' },
    { id: 'user/1000/label/ai', label: 'AI' },
    { id: 'user/1000/label/performance', label: 'Performance' },
];

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- API Functions using Supabase and FreshRSS backend ---

// getAvailableDates is removed as per user request.

export const getBriefingReportsByDate = async (): Promise<BriefingReport[]> => {
    try {
        const { data, error } = await supabase
            .from('articles')
            .select('*')
            .order('published', { ascending: false }); // Corrected to use 'published'

        if (error) throw error;

        if (data.length === 0) return [];

        const reportsMap = new Map<string, BriefingReport>();

        data.forEach((article: Article) => {
            const section = article.briefingSection || '未分类';
            if (!reportsMap.has(section)) {
                reportsMap.set(section, { id: Math.random(), title: `${section}简报`, articles: [] });
            }
            reportsMap.get(section)?.articles.push(article);
        });

        // Group all articles under a single "Today" report as per user request
        const allArticlesReport: BriefingReport = {
            id: 1, // A fixed ID for the "Today" report
            title: '今日简报',
            articles: data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
        };

        return [allArticlesReport];
    } catch (error) {
        console.error(`Failed to fetch briefing reports from Supabase:`, error);
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
        const response = await fetch('/api/articles', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: article.id }),
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
    // This function would ideally update Supabase or FreshRSS, but for now, it's a placeholder.
    await sleep(400);
    console.log(`Updating state for ${articleId} (placeholder): ${action} ${isAdding ? 'add' : 'remove'}`);
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
    console.log(`Updating tags for ${articleId} (placeholder): add [${tagsToAdd.join(',')}] remove [${tagsToRemove.join(',')}]`);
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