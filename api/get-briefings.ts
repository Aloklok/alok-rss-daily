// /api/get-briefings.ts

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Article } from '../types';
import { apiHandler, getSupabaseClient } from './_utils.js';

async function getBriefings(req: VercelRequest, res: VercelResponse) {
    const { date, slot, articleIds } = req.query;

    // 1. 【新增】按 ID 查询的逻辑
    if (articleIds) {
        const supabase = getSupabaseClient();
        const ids = Array.isArray(articleIds) ? articleIds : [articleIds];
        const { data: articles, error } = await supabase
            .from('articles')
            .select('*')
            .in('id', ids);

        if (error) {
            console.error('Error fetching from Supabase by IDs:', error);
            throw new Error(error.message);
        }
        // 按 ID 查询时，直接返回一个以 ID 为键的对象，方便前端查找
        const articlesById = (articles || []).reduce((acc, article) => {
            acc[article.id] = article;
            return acc;
        }, {} as Record<string, Article>);
        
        return res.status(200).json(articlesById);
    }

    // 2. 【保留】原有的按日期查询逻辑
    if (!date || typeof date !== 'string') {
        return res.status(400).json({ message: 'Date parameter is required.' });
    }

    const supabase = getSupabaseClient();
    let query = supabase.from('articles').select('*');

    const startDate = new Date(`${date}T00:00:00.000+08:00`);
    const endDate = new Date(`${date}T23:59:59.999+08:00`);

    if (slot === 'morning') {
        endDate.setHours(11, 59, 59, 999);
    } else if (slot === 'afternoon') {
        startDate.setHours(12, 0, 0, 0);
        endDate.setHours(18, 59, 59, 999);
    } else if (slot === 'evening') {
        startDate.setHours(19, 0, 0, 0);
    }

    query = query.gte('n8n_processing_date', startDate.toISOString());
    query = query.lte('n8n_processing_date', endDate.toISOString());

    const { data: articles, error } = await query;

    if (error) {
        console.error('Error fetching from Supabase by date:', error);
        throw new Error(error.message);
    }

    if (!articles || articles.length === 0) {
        return res.status(200).json({});
    }

    const uniqueById = new Map<string | number, Article>();
    articles.forEach((a: any) => { uniqueById.set(a.id, a as Article); });
    const deduped = Array.from(uniqueById.values());

    const groupedArticles: { [key: string]: Article[] } = {
        '重要新闻': [], '必知要闻': [], '常规更新': [],
    };

    deduped.forEach(article => {
        const importance = article.verdict?.importance || '常规更新';
        groupedArticles[importance] = groupedArticles[importance] || [];
        groupedArticles[importance].push(article);
    });

    for (const importance in groupedArticles) {
        groupedArticles[importance].sort((a, b) => (b.verdict?.score || 0) - (a.verdict?.score || 0));
    }

    return res.status(200).json(groupedArticles);
}

export default apiHandler(['GET'], getBriefings);