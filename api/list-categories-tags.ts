import type { VercelRequest, VercelResponse } from '@vercel/node';
import { apiHandler, getFreshRssClient } from './_utils.js';

interface FreshRssTag {
    id: string;
    type: string;
}

async function listCategoriesAndTags(req: VercelRequest, res: VercelResponse) {
    const freshRss = getFreshRssClient();
    const data = await freshRss.get<{ tags: FreshRssTag[] }>('/tag/list', { output: 'json' });

    const categories: { id: string; label: string }[] = [];
    const tags: { id: string; label: string }[] = [];

    if (data.tags) {
        data.tags.forEach((item) => {
            const label = decodeURIComponent(item.id.split('/').pop() || '');
            if (item.type === 'folder') {
                categories.push({ id: item.id, label });
            } else if (item.type === 'tag' && !item.id.includes('/state/com.google/')) {
                tags.push({ id: item.id, label });
            }
        });
    }
    
    const sortByName = (a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label);

    return res.status(200).json({
        categories: categories.sort(sortByName),
        tags: tags.sort(sortByName),
    });
}

export default apiHandler(['GET'], listCategoriesAndTags);