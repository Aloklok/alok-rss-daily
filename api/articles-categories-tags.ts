import type { VercelRequest, VercelResponse } from '@vercel/node';

declare const process: any;

const GREADER_API_URL = process.env.FRESHRSS_API_URL;
const AUTH_TOKEN = process.env.FRESHRSS_AUTH_TOKEN;

function toIsoTimestamp(value: any): string {
    if (!value) return new Date().toISOString();
    const n = typeof value === 'string' ? Number(value) : value;
    if (Number.isNaN(n)) return new Date().toISOString();
    const ms = n > 1e12 ? n : n <= 1e10 ? n * 1000 : n;
    return new Date(ms).toISOString();
}

function mapFreshItemToMinimalArticle(item: any) {
    const id = item.id || item.canonical?.[0]?.href || item.alternate?.[0]?.href || '';
    const link = item.alternate?.[0]?.href || item.canonical?.[0]?.href || '';
    const title = item.title || '';
    const sourceName = item.origin?.title || (item.canonical?.[0]?.title || '');
    const categories: string[] = Array.isArray(item.categories) ? item.categories : [];

    return {
        id,
        title,
        link,
        sourceName,
        // Provide default/empty values for other Article fields to minimize payload
        created_at: new Date().toISOString(),
        published: new Date().toISOString(),
        category: '',
        briefingSection: '',
        keywords: [],
        verdict: { type: '', score: 0 },
        summary: '', // Keep the property but leave it empty
        tldr: '',
        highlights: '',
        critiques: '',
        marketTake: '',
        tags: categories,
    };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!GREADER_API_URL || !AUTH_TOKEN) {
        return res.status(500).json({ message: 'Server configuration error: Missing FreshRSS environment variables.' });
    }

    const { name } = req.query;

    if (!name || typeof name !== 'string') {
        return res.status(400).json({ message: 'Folder/tag name is required.' });
    }

    try {
        const folderName = encodeURIComponent(name);
        const streamId = `user/-/label/${folderName}`;
        const url = `${GREADER_API_URL}/greader.php/reader/api/0/stream/contents/${streamId}?output=json`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `GoogleLogin auth=${AUTH_TOKEN}`,
            },
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`FreshRSS stream content API responded with ${response.status}:`, errorBody);
            return res.status(502).json({ message: 'Failed to fetch stream content from FreshRSS', status: response.status, body: errorBody });
        }

        const data = await response.json();
        const items = Array.isArray(data.items) ? data.items : [];
        const articles = items.map(mapFreshItemToMinimalArticle);

        return res.status(200).json(articles);
    } catch (error: any) {
        console.error('Error in /api/articles-categories-tags:', error);
        return res.status(500).json({ message: 'Error fetching stream articles', error: error.message });
    }
}
