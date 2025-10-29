import type { VercelRequest, VercelResponse } from '@vercel/node';

// Minimal runtime declaration for `process` to satisfy TypeScript in this demo environment.
// If your project already has `@types/node` installed, you can remove this line.
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

function mapFreshItemToArticle(item: any) {
    const id = item.id || item.canonical?.[0]?.href || item.alternate?.[0]?.href || '';
    const link = item.alternate?.[0]?.href || item.canonical?.[0]?.href || '';
    const title = item.title || '';
    const sourceName = item.origin?.title || (item.canonical?.[0]?.title || '');
    const published = item.published ? toIsoTimestamp(item.published) : toIsoTimestamp(item.updated || item.crawled);
    const created_at = toIsoTimestamp(item.crawled || item.published || item.updated);
    const categories: string[] = Array.isArray(item.categories) ? item.categories : [];
    const summary = item.summary?.content || item.content?.content || '';

    return {
        id,
        created_at,
        title,
        link,
        sourceName,
        published,
        category: '',
        briefingSection: '',
        keywords: [],
        verdict: { type: '', score: 0 },
        summary: summary || '',
        tldr: '',
        highlights: '',
        critiques: '',
        marketTake: '',
        tags: categories,
    };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    console.log('Checking for environment variables in /api/starred...');
    console.log(`FRESHRSS_API_URL is set: ${!!process.env.FRESHRSS_API_URL}`);
    console.log(`FRESHRSS_AUTH_TOKEN is set: ${!!process.env.FRESHRSS_AUTH_TOKEN}`);

    if (!GREADER_API_URL || !AUTH_TOKEN) {
        return res.status(500).json({ message: 'Server configuration error: Missing FreshRSS environment variables.' });
    }

    try {
    const streamId = encodeURIComponent('user/-/state/com.google/starred');
    // Use same greader.php prefix as /api/filters.ts to match FreshRSS install URL structure
    const url = `${GREADER_API_URL}/greader.php/reader/api/0/stream/contents/${streamId}?output=json`;
    console.log('Requesting FreshRSS starred stream URL:', url);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `GoogleLogin auth=${AUTH_TOKEN}`,
            },
        });

        if (!response.ok) {
            const body = await response.text();
            console.error(`/api/starred FreshRSS responded ${response.status}:`, body);
            return res.status(502).json({ message: 'Failed to fetch starred stream from FreshRSS', status: response.status, body });
        }

        const data = await response.json();
        const items = Array.isArray(data.items) ? data.items : [];
        const articles = items.map(mapFreshItemToArticle);

        return res.status(200).json(articles);
    } catch (error: any) {
        console.error('Error in /api/starred:', error);
        return res.status(500).json({ message: 'Error fetching starred articles', error: error.message });
    }
}
