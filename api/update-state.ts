import type { VercelRequest, VercelResponse } from '@vercel/node';
import { apiHandler, getFreshRssClient } from './_utils.js';

async function updateArticleState(req: VercelRequest, res: VercelResponse) {
    const { articleId, articleIds, action, isAdding, tagsToAdd, tagsToRemove } = req.body;
    

    if ((!articleId && (!articleIds || !Array.isArray(articleIds))) || (!action && typeof isAdding === 'undefined' && (!tagsToAdd || !Array.isArray(tagsToAdd) || tagsToAdd.length === 0) && (!tagsToRemove || !Array.isArray(tagsToRemove) || tagsToRemove.length === 0))) {
        return res.status(400).json({ message: 'Missing required parameters' });
    }
    // When action is provided, isAdding must be a boolean if it's defined
    if (action && typeof isAdding !== 'undefined' && typeof isAdding !== 'boolean') {
        return res.status(400).json({ message: 'When action is provided, isAdding must be a boolean' });
    }

    const freshRss = getFreshRssClient();
    const shortLivedToken = await freshRss.getActionToken();

    const params = new URLSearchParams();
    const ids = articleIds && Array.isArray(articleIds) ? articleIds : [articleId];
    ids.forEach(id => params.append('i', String(id)));
    params.append('T', shortLivedToken);
    
    if (action && typeof isAdding === 'boolean') {
        const tagMap = {
            star: 'user/-/state/com.google/starred',
            read: 'user/-/state/com.google/read',
        };
        const tag = tagMap[action as 'star' | 'read'];
        if (tag) {
            params.append(isAdding ? 'a' : 'r', tag);
        }
    }

    if (tagsToAdd && Array.isArray(tagsToAdd) && tagsToAdd.length > 0) {
        tagsToAdd.forEach((tag: string) => params.append('a', tag));
    }
    if (tagsToRemove && Array.isArray(tagsToRemove) && tagsToRemove.length > 0) {
        tagsToRemove.forEach((tag: string) => params.append('r', tag));
    }

    const responseText = await freshRss.post<string>('/edit-tag', params);

    if (responseText.trim() !== 'OK') {
        throw new Error(`Failed to update state. FreshRSS responded with: ${responseText}`);
    }

    return res.status(200).json({ success: true });
}

export default apiHandler(['POST'], updateArticleState);
