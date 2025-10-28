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
        // FreshRSS doesn't have a bulk state lookup. We have to fetch all items
        // with their states and then filter.
        const response = await fetch(`${GREADER_API_URL}/greader.php/reader/api/0/stream/contents/?output=json`, {
            method: 'GET',
            headers: { 'Authorization': `GoogleLogin auth=${AUTH_TOKEN}` },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch article stream');
        }

        const data = await response.json();
        
        const states: { [key: string]: string[] } = {};
        const articleIdSet = new Set(articleIds.map(String));

        if (data.items) {
             data.items.forEach((item: { id: string; categories: string[] }) => {
                // GReader API sometimes uses a different ID format. We need to normalize.
                // A common case is Supabase having UUIDs while FreshRSS has its own format.
                // This is a placeholder for a real normalization strategy. For now, we look for inclusion.
                const matchingId = Array.from(articleIdSet).find(id => item.id.includes(id));

                if (matchingId) {
                    states[matchingId] = item.categories || [];
                }
            });
        }

        res.status(200).json(states);

    } catch (error: any) {
        console.error("Error in /api/article-states:", error);
        res.status(500).json({ message: 'Error fetching article states', error: error.message });
    }
}