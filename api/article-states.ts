import type { VercelRequest, VercelResponse } from '@vercel/node';

const GREADER_API_URL = process.env.FRESHRSS_API_URL;
const AUTH_TOKEN = process.env.FRESHRSS_AUTH_TOKEN;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }
    
    if (!GREADER_API_URL || !AUTH_TOKEN) {
        return res.status(500).json({ message: 'Server configuration error: Missing FreshRSS environment variables.' });
    }

    const { articleIds } = req.body;
    if (!Array.isArray(articleIds) || articleIds.length === 0) {
        return res.status(200).json({}); // Return empty if no IDs are provided, not an error.
    }

    try {
        // 使用stream/items/contents API端点批量获取文章状态
        const url = `${GREADER_API_URL}/greader.php/reader/api/0/stream/items/contents?output=json&excludeContent=1`;
        // 构建请求体，为每个文章ID添加一个i参数
        const formData = new URLSearchParams();
        articleIds.forEach(id => {
            formData.append('i', String(id));
        });
        console.log(formData.toString());
        const response = await fetch(url, {
            method: 'POST',
            headers: { 
                'Authorization': `GoogleLogin auth=${AUTH_TOKEN}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error('Failed to fetch article states');
        }

        const data = await response.json();
        const states: { [key: string]: string[] } = {};

        if (data.items) {
            data.items.forEach((item: { id: string; tags: string[]; annotations: Array<{id: string}> }) => {
                // 处理标签和状态
                const stateTags: string[] = [];
                
                // 处理普通标签
                if (item.tags && Array.isArray(item.tags)) {
                    // 规范化为前端期望的完整标签ID格式：user/1000/label/<name>
                    stateTags.push(...item.tags.map(t => `user/1000/label/${t}`));
                }
                
                // 处理已读和收藏状态
                if (item.annotations && Array.isArray(item.annotations)) {
                    item.annotations.forEach(annotation => {
                        if (annotation.id === 'user/-/state/com.google/read' || 
                            annotation.id === 'user/-/state/com.google/starred') {
                            stateTags.push(annotation.id);
                        }
                    });
                }
                
                // 直接使用item.id作为键，因为我们是通过ID精确查询的
                states[item.id] = stateTags;
            });
        }

        res.status(200).json(states);

    } catch (error: any) {
        console.error("Error in /api/article-states:", error);
        res.status(500).json({ message: 'Error fetching article states', error: error.message });
    }
}