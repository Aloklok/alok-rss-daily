import type { VercelRequest, VercelResponse } from '@vercel/node';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
        return res.status(400).json({ message: 'URL parameter is required.' });
    }

    try {
        const fetchRes = await fetch(url);
        if (!fetchRes.ok) {
            throw new Error(`Failed to fetch URL with status: ${fetchRes.status}`);
        }
        const html = await fetchRes.text();
        const doc = new JSDOM(html, { url });
        
        const reader = new Readability(doc.window.document);
        const article = reader.parse();

        if (!article) {
            throw new Error('Readability could not parse the article.');
        }

        res.status(200).json({
            title: article.title,
            content: article.content, // This is sanitized HTML
            source: article.siteName || new URL(url).hostname,
        });

    } catch (error: any) {
        console.error(`Error in /api/readability for url: ${url}`, error);
        res.status(500).json({ message: 'Error processing article', error: error.message });
    }
}
