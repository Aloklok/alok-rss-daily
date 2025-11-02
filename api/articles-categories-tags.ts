// /api/articles-categories-tags.ts

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { apiHandler, getFreshRssClient } from './_utils.js';
import { Article } from '../types';

function mapFreshItemToMinimalArticle(item: any): Article {
    const annotationTags = (item.annotations || [])
        .map((anno: { id: string }) => anno.id)
        .filter(Boolean);

    const allTags = [
        ...(Array.isArray(item.categories) ? item.categories : []),
        ...annotationTags
    ];

    return {
        id: item.id || '',
        title: item.title || '',
        link: item.alternate?.[0]?.href || '',
        sourceName: item.origin?.title || '',
        created_at: new Date().toISOString(),
        published: new Date(item.published * 1000).toISOString(),
        category: '', // Supabase field, default value
        briefingSection: '', // Supabase field, default value
        keywords: [], // Supabase field, default value
        verdict: { type: '', score: 0 }, // Supabase field, default value
        summary: '', // Supabase field, default value
        tldr: '', // Supabase field, default value
        highlights: '', // Supabase field, default value
        critiques: '', // Supabase field, default value
        marketTake: '', // Supabase field, default value
        n8n_processing_date: undefined, // Supabase field, default value
        tags: allTags,
    };
}

async function getArticlesByLabel(req: VercelRequest, res: VercelResponse) {
    const { value: streamId } = req.query;
    if (!streamId || typeof streamId !== 'string') {
        return res.status(400).json({ message: 'Stream ID is required.' });
    }
    const freshRss = getFreshRssClient();
    const data = await freshRss.get<{ items: any[] }>(`/stream/contents/${streamId}`, {
        output: 'json',
        excludeContent: '1'
    });
    const articles = (data.items || []).map(mapFreshItemToMinimalArticle);
    return res.status(200).json(articles);
}

export default apiHandler(['GET'], getArticlesByLabel);