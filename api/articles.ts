import type { VercelRequest, VercelResponse } from '@vercel/node';

declare const process: any;

const GREADER_API_URL = process.env.FRESHRSS_API_URL;
const AUTH_TOKEN = process.env.FRESHRSS_AUTH_TOKEN;

// This handler now fetches the content of a single article from FreshRSS.
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Only POST requests are allowed' });
    }

    if (!GREADER_API_URL || !AUTH_TOKEN) {
        return res.status(500).json({ message: 'Server configuration error: Missing FreshRSS environment variables.' });
    }

    const { id } = req.body;

    if (!id || typeof id !== 'string') {
        return res.status(400).json({ message: 'Article ID is required.' });
    }

    try {
        const url = `${GREADER_API_URL}/greader.php/reader/api/0/stream/items/contents?output=json`;
        const body = new URLSearchParams({ i: id }).toString();

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `GoogleLogin auth=${AUTH_TOKEN}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body,
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`FreshRSS content API responded with ${response.status}:`, errorBody);
            return res.status(502).json({ message: 'Failed to fetch article content from FreshRSS', status: response.status, body: errorBody });
        }

        const data = await response.json();

        // The response for a single item is not an array, but an object with an `items` array of one.
        if (!data.items || data.items.length === 0) {
            return res.status(404).json({ message: 'Article content not found in FreshRSS response.' });
        }

        const item = data.items[0];
        const content = item.summary?.content || item.content?.content || '';
        const source = item.origin?.title || new URL(item.canonical[0]?.href).hostname;

        return res.status(200).json({
            title: item.title,
            content: content,
            source: source,
        });

    } catch (error: any) {
        console.error('Error fetching article content:', error);
        return res.status(500).json({ message: 'Error fetching article content', error: error.message });
    }
}