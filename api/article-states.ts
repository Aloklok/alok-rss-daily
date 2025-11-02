// /api/get-article-states.ts

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { apiHandler, getFreshRssClient } from './_utils.js';

// 扩展接口以包含 annotations
interface FreshRssItem {
    id: string;
    categories: string[];
    annotations?: { id: string }[];
}

async function getArticleStates(req: VercelRequest, res: VercelResponse) {
    const { articleIds } = req.body;
    
    if (!Array.isArray(articleIds) || articleIds.length === 0) {
        return res.status(200).json({});
    }

    const freshRss = getFreshRssClient();
    const formData = new URLSearchParams();
    articleIds.forEach(id => formData.append('i', String(id)));
    
    // 使用 stream/items/contents 端点，它能返回 annotations
    const data = await freshRss.post<{ items: FreshRssItem[] }>('/stream/items/contents?output=json&excludeContent=1', formData);
    
    const states: { [key: string]: string[] } = {};
    if (data.items) {
        data.items.forEach((item: FreshRssItem) => {
            // 1. 【核心修复】从 annotations 中提取状态标签
            const annotationTags = (item.annotations || [])
                .map(anno => anno.id)
                .filter(Boolean);

            // 2. 【核心修复】将 categories 和 annotationTags 合并
            // categories 包含了分类和用户标签的底层 ID
            const allTags = [
                ...(item.categories || []),
                ...annotationTags
            ];
            
            // 3. 【核心修复】使用去重后的完整列表
            states[item.id] = [...new Set(allTags)];
        });
    }

    return res.status(200).json(states);
}

export default apiHandler(['POST'], getArticleStates);