// /api/list-categories-tags.ts

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { apiHandler, getFreshRssClient } from './_utils.js';
import { Tag } from '../types'; // 1. 【核心修改】直接导入前端的 Tag 类型

// 2. 【核心修改】扩展 FreshRssTag 接口以包含新字段
interface FreshRssTag {
    id: string;
    type: string;
    count?: number; // count 是可选的
}

async function listCategoriesAndTags(req: VercelRequest, res: VercelResponse) {
    const freshRss = getFreshRssClient();
    
    // 3. 【核心修改】在 API 调用中加入 with_counts=1 参数
    const data = await freshRss.get<{ tags: FreshRssTag[] }>('/tag/list', { 
        output: 'json',
        with_counts: '1' // 添加此参数以获取数量
    });

    // 4. 【核心修改】现在 categories 和 tags 的类型都是 Tag[]
    const categories: Tag[] = [];
    const tags: Tag[] = [];

    if (data.tags) {
        data.tags.forEach((item) => {
            const label = decodeURIComponent(item.id.split('/').pop() || '');
            
            // 过滤掉所有谷歌阅读器状态和 FreshRSS 自身的状态标签
            if (item.id.includes('/state/com.google/') || item.id.includes('/state/org.freshrss/')) {
                return;
            }

            if (item.type === 'folder') {
                // 直接创建一个符合 Tag 接口的对象
                categories.push({ id: item.id, label, count: item.count });
            } else { // 所有非 folder 且非 state 的都视为 tag
                tags.push({ id: item.id, label, count: item.count });
            }
        });
    }
    
    const sortByName = (a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label, 'zh-Hans-CN');

    return res.status(200).json({
        categories: categories.sort(sortByName),
        tags: tags.sort(sortByName),
    });
}

export default apiHandler(['GET'], listCategoriesAndTags);