import type { VercelRequest, VercelResponse } from '@vercel/node';

const GREADER_API_URL = process.env.FRESHRSS_API_BASE_URL;
const AUTH_TOKEN = process.env.FRESHRSS_AUTH_TOKEN;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!GREADER_API_URL || !AUTH_TOKEN) {
        return res.status(500).json({ message: 'Server configuration error: Missing FreshRSS environment variables.' });
    }

    try {
        const response = await fetch(`${GREADER_API_URL}/reader/api/0/tag/list?output=json`, {
            method: 'GET',
            headers: {
                'Authorization': `${AUTH_TOKEN}`,
            },
        });

        if (!response.ok) {
            // Log the error for debugging on Vercel
            console.error(`FreshRSS API responded with status: ${response.status}`);
            const errorBody = await response.text();
            console.error(`FreshRSS API error body: ${errorBody}`);
            throw new Error(`Failed to fetch tags and categories. Status: ${response.status}`);
        }

        const data = await response.json();

        const categories: string[] = [];
        const tags: string[] = [];

        if (data.tags) {
            data.tags.forEach((item: { id: string; type: string }) => {
                const label = decodeURIComponent(item.id.split('/').pop() || '');
                if (item.type === 'folder') {
                    categories.push(label);
                } else if (item.type === 'tag' && !item.id.includes('/state/com.google/')) {
                    tags.push(label);
                }
            });
        }
        
        res.status(200).json({
            categories: categories.sort(),
            tags: tags.sort(),
        });

    } catch (error: any) {
        console.error("Error in /api/filters:", error);
        res.status(500).json({ message: 'Error fetching filters', error: error.message });
    }
}
