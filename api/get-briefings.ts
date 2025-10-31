import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Article } from '../types';
import { apiHandler, getSupabaseClient } from './_utils.js';

async function getBriefings(req: VercelRequest, res: VercelResponse) {
    const { date, slot } = req.query;

    if (!date || typeof date !== 'string') {
        return res.status(400).json({ message: 'Date parameter is required.' });
    }

    const supabase = getSupabaseClient();
    
    let query = supabase
        .from('articles')
        .select('*');

    // Apply date range filtering based on Asia/Shanghai timezone
    const startDate = new Date(`${date}T00:00:00.000+08:00`);
    const endDate = new Date(`${date}T23:59:59.999+08:00`);

    if (slot === 'morning') {
        endDate.setHours(11, 59, 59, 999);
    } else if (slot === 'afternoon') {
        startDate.setHours(12, 0, 0, 0);
        endDate.setHours(17, 59, 59, 999);
    } else if (slot === 'evening') {
        startDate.setHours(18, 0, 0, 0);
    }

    query = query.gte('n8n_processing_date', startDate.toISOString());
    query = query.lte('n8n_processing_date', endDate.toISOString());

    const { data, error } = await query;

    if (error) {
        console.error('Supabase error:', error);
        return res.status(500).json({ message: 'Error fetching articles from Supabase', error: error.message });
    }

    if (!data || data.length === 0) {
        return res.status(200).json({});
    }

    // Deduplicate by id
    const uniqueById = new Map<string | number, Article>();
    data.forEach((a: any) => {
        uniqueById.set(a.id, a as Article);
    });
    const deduped = Array.from(uniqueById.values());

    // Group articles by importance and sort by score within each group
    const groupedArticles: { [key: string]: Article[] } = {
        '重要新闻': [],
        '必知要闻': [],
        '常规更新': [],
    };

    deduped.forEach(article => {
        const importance = article.verdict?.importance || '常规更新';
        if (groupedArticles[importance]) {
            groupedArticles[importance].push(article);
        } else {
            groupedArticles['常规更新'].push(article); // Fallback for unknown importance
        }
    });

    // Sort articles within each group by score descending
    for (const importance in groupedArticles) {
        groupedArticles[importance].sort((a, b) => (b.verdict?.score || 0) - (a.verdict?.score || 0));
    }

    return res.status(200).json(groupedArticles);
}

export default apiHandler(['GET'], getBriefings);