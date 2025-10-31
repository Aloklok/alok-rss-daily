import type { VercelRequest, VercelResponse } from '@vercel/node';
import { apiHandler, getFreshRssClient } from './_utils.js';
import { Article } from '../types';

function mapFreshItemToMinimalArticle(item: any): Article {
    return {
        id: item.id || '',
        title: item.title || '',
        link: item.alternate?.[0]?.href || '',
        sourceName: item.origin?.title || '',
        created_at: new Date().toISOString(),
        published: new Date(item.published * 1000).toISOString(),
        category: '',
        briefingSection: '',
        keywords: [],
        verdict: { type: '', score: 0 },
        summary: '',
        tldr: '',
        highlights: '',
        critiques: '',
        marketTake: '',
        tags: Array.isArray(item.categories) ? item.categories : [],
    };
}

async function getStarredArticles(req: VercelRequest, res: VercelResponse) {
    const freshRss = getFreshRssClient();
    const streamId = encodeURIComponent('user/-/state/com.google/starred');
    const data = await freshRss.get<{ items: any[] }>(`/stream/contents/${streamId}`, {
        output: 'json',
        excludeContent: '1'
    });

    const articles = (data.items || []).map(mapFreshItemToMinimalArticle);
    return res.status(200).json(articles);
}

export default apiHandler(['GET'], getStarredArticles);