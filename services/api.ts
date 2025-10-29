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
    const dates: string[] = [];
    const todayFormatted = getTodayInShanghai();

    if (!todayFormatted) return [];

    const [yearStr, monthStr, dayStr] = todayFormatted.split('-');
    const currentYear = parseInt(yearStr, 10);
    const currentMonth = parseInt(monthStr, 10) - 1; // Month is 0-indexed
    const currentDay = parseInt(dayStr, 10);

    for (let i = 1; i <= currentDay; i++) {
        const date = new Date(currentYear, currentMonth, i);
        // Format: YYYY-MM-DD for internal use and filtering
        const formattedYear = date.getFullYear();
        const formattedMonth = String(date.getMonth() + 1).padStart(2, '0');
        const formattedDay = String(date.getDate()).padStart(2, '0');
        dates.push(`${formattedYear}-${formattedMonth}-${formattedDay}`);
    }
    return dates.reverse(); // Display newest first
};

type TimeSlot = 'morning' | 'afternoon' | 'evening';

export const getBriefingReportsByDate = async (date: string, slot?: TimeSlot): Promise<BriefingReport[]> => {
    try {
        let data: Article[] = [];
        let error: any = null;

        // Compare by Shanghai local day: use explicit +08:00 offsets
        // Time slot windows (Asia/Shanghai):
        // - morning:    00:00:00.000 — 11:59:59.999
        // - afternoon:  12:00:00.000 — 17:59:59.999
        // - evening:    18:00:00.000 — 23:59:59.999

        const makeRange = (start: string, end: string) => ({ start, end });
        const pad = (n: number) => String(n).padStart(2, '0');
        const toNextDate = (ds: string) => {
            const [y, m, d] = ds.split('-').map(v => parseInt(v, 10));
            const dt = new Date(Date.UTC(y, (m - 1), d));
            dt.setUTCDate(dt.getUTCDate() + 1);
            const ny = dt.getUTCFullYear();
            const nm = pad(dt.getUTCMonth() + 1);
            const nd = pad(dt.getUTCDate());
            return `${ny}-${nm}-${nd}`;
        };

        let ranges: Array<{ start: string; end: string }>; 
        if (!slot) {
            ranges = [makeRange(`${date}T00:00:00.000+08:00`, `${date}T23:59:59.999+08:00`)];
        } else if (slot === 'morning') {
            ranges = [makeRange(`${date}T00:00:00.000+08:00`, `${date}T11:59:59.999+08:00`)];
        } else if (slot === 'afternoon') {
            ranges = [makeRange(`${date}T12:00:00.000+08:00`, `${date}T17:59:59.999+08:00`)];
        } else {
            // evening
            ranges = [makeRange(`${date}T18:00:00.000+08:00`, `${date}T23:59:59.999+08:00`)];
        }

        // Execute one or two queries depending on ranges
        for (const r of ranges) {
            const { data: chunk, error: err } = await supabase
                .from('articles')
                .select('*')
                .gte('crawlTime', r.start)
                .lte('crawlTime', r.end);
            if (err) {
                error = err;
                break;
            }
            if (chunk && chunk.length > 0) data = data.concat(chunk as any);
        }

        if (error) throw error;

        if (!data || data.length === 0) return [];

        const reportsMap = new Map<string, BriefingReport>();

        data.forEach((article: Article) => {
            const section = article.briefingSection || '未分类';
            if (!reportsMap.has(section)) {
                reportsMap.set(section, { id: Math.random(), title: `${section}简报`, articles: [] });
            }
            reportsMap.get(section)?.articles.push(article);
        });

        // Group all articles under a single "Today" report if no specific date filter was applied
        // Or if a specific date filter was applied, group them under a report for that date
        // Deduplicate by id, then sort by crawlTime descending with a fallback to published when crawlTime is missing
        const uniqueById = new Map<string | number, Article>();
        data.forEach((a) => {
            uniqueById.set(a.id, a);
        });
        const deduped = Array.from(uniqueById.values());
        const articlesForReport = deduped.sort((a: Article, b: Article) => {
            const aTime = new Date(a.crawlTime || a.published).getTime();
            const bTime = new Date(b.crawlTime || b.published).getTime();
            return bTime - aTime;
        });
        const reportTitle = date === 'today' ? '今日简报' : `${new Date(date).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}简报`;

        const singleReport: BriefingReport = {
            id: 1, // A fixed ID for the main report
            title: reportTitle,
            articles: articlesForReport,
        };

        return [singleReport];
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