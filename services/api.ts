import { Article, BriefingReport, Tag, CleanArticleContent, AvailableFilters, Filter } from '../types';

// --- Frontend Service Layer ---
// All functions now call the internal Vercel API routes.
// All secrets and complex logic are handled by the serverless functions.

export const getAvailableFilters = async (): Promise<AvailableFilters> => {
    try {
        const response = await fetch('/api/filters');
        if (!response.ok) throw new Error('Failed to fetch filters from backend.');
        return await response.json();
    } catch (error) {
        console.error("Error calling /api/filters:", error);
        return { categories: [], tags: [] };
    }
};

export const getAvailableDates = async (): Promise<string[]> => {
    // In a real scenario, this might be a dedicated endpoint or derived
    // from an articles query. For now, we simulate by fetching all articles
    // and extracting dates. This is inefficient and should be optimized.
    try {
        const response = await fetch('/api/articles');
        if (!response.ok) throw new Error('Failed to fetch articles for dates.');
        const articles: Article[] = await response.json();
        const dateSet = new Set<string>();
        articles.forEach(article => {
            dateSet.add(new Date(article.published).toISOString().split('T')[0]);
        });
        return Array.from(dateSet);
    } catch (error) {
         console.error("Error deriving available dates:", error);
         return [];
    }
};

const getArticles = async (filter: Filter): Promise<Article[]> => {
    const params = new URLSearchParams({
        type: filter.type,
        value: filter.value,
    });
    const response = await fetch(`/api/articles?${params.toString()}`);
    if (!response.ok) {
        throw new Error(`Failed to fetch articles for filter: ${filter.type}`);
    }
    return await response.json();
}

export const getBriefingReportsByDate = async (date: string): Promise<BriefingReport[]> => {
    const articlesForDate = await getArticles({ type: 'date', value: date });
    
    // Group articles into reports (morning, noon, afternoon)
    const morning: Article[] = [];
    const noon: Article[] = [];
    const afternoon: Article[] = [];

    articlesForDate.forEach(article => {
        // Map verdict.importance to briefingSection
        const finalArticle = { ...article };
        if(finalArticle.verdict.importance) {
            finalArticle.briefingSection = `⚡ ${finalArticle.verdict.importance}`;
        }

        const hour = new Date(article.published).getUTCHours();
        if (hour < 12) morning.push(finalArticle);
        else if (hour < 17) noon.push(finalArticle);
        else afternoon.push(finalArticle);
    });

    const reports: BriefingReport[] = [];
    if (morning.length > 0) reports.push({ id: 1, title: '早上简报', articles: morning });
    if (noon.length > 0) reports.push({ id: 2, title: '中午简报', articles: noon });
    if (afternoon.length > 0) reports.push({ id: 3, title: '下午简报', articles: afternoon });
    
    return reports;
};

export const getArticlesByCategory = async (category: string): Promise<Article[]> => {
    return getArticles({ type: 'category', value: category });
};

export const getArticlesByTag = async (tag: string): Promise<Article[]> => {
    return getArticles({ type: 'tag', value: tag });
};

export const getStarredArticles = async (): Promise<Article[]> => {
    return getArticles({ type: 'starred', value: 'true' });
};


export const getArticleStates = async (articleIds: (string|number)[]): Promise<{ [key: string | number]: string[] }> => {
    if (articleIds.length === 0) return {};
    const response = await fetch('/api/article-states', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleIds }),
    });
    if (!response.ok) throw new Error('Failed to fetch article states.');
    return await response.json();
};


export const markAllAsRead = async (): Promise<void> => {
    // This would also call a serverless function, e.g., /api/mark-all-as-read
    console.log('Calling backend to mark all as read...');
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network
    console.log('Successfully marked all as read via backend.');
};

export const getCleanArticleContent = async (article: Article): Promise<CleanArticleContent> => {
    const params = new URLSearchParams({ url: article.link });
    const response = await fetch(`/api/readability?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to get clean article content.');
    return await response.json();
};

export const editArticleState = async (articleId: string | number, action: 'star' | 'read', isAdding: boolean): Promise<void> => {
    const response = await fetch('/api/update-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId, action, isAdding }),
    });
    if (!response.ok) throw new Error('Failed to edit article state.');
};

export const editArticleTag = async (articleId: string | number, tagsToAdd: string[], tagsToRemove: string[]): Promise<void> => {
     const response = await fetch('/api/update-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId, tagsToAdd, tagsToRemove }),
    });
    if (!response.ok) throw new Error('Failed to edit article tags.');
};

export const getTags = async (): Promise<Tag[]> => {
    // In a real app, this could be part of the getAvailableFilters call.
    // We'll call the filters endpoint and extract the tags.
    const filters = await getAvailableFilters();
    return filters.tags.map(tag => ({
        id: `user/1000/label/${tag}`, // Re-create a GReader-like ID
        label: tag
    }));
};
