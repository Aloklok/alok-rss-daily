import type { VercelRequest, VercelResponse } from '@vercel/node';
import { apiHandler, getFreshRssClient } from './_utils.js';

async function getArticleStates(req: VercelRequest, res: VercelResponse) {
    // 从请求体获取 articleIds
    const { articleIds } = req.body;
    
    if (!Array.isArray(articleIds) || articleIds.length === 0) {
        return res.status(200).json({});
    }

    const freshRss = getFreshRssClient();
    const formData = new URLSearchParams();
    articleIds.forEach(id => formData.append('i', String(id)));
    
    const data = await freshRss.post<{ items: any[] }>('/stream/items/contents?output=json&excludeContent=1', formData);
    const states: { [key: string]: string[] } = {};
    if (data.items) {
        data.items.forEach((item: { id: string; categories: string[]; }) => {
            // FreshRSS uses 'tags' for tags in this context
           
            const itemTags = item.tags || [];
            // Normalize tags to include the full path expected by the frontend for user-created tags
            const normalizedTags = itemTags.map(tag => {
                if (tag.startsWith('user/-/state/')) return tag; // State tags are already in the correct format
                return `user/1000/label/${tag}`; // Assume user tags need normalization
            });
            states[item.id] = normalizedTags;
        });
    }

    return res.status(200).json(states);
}

export default apiHandler(['POST'], getArticleStates);
