import type { VercelRequest, VercelResponse } from '@vercel/node';

// `api/articles` should be backed by Supabase in production. This endpoint currently
// acts as a placeholder and will return 501 (Not Implemented) when Supabase env is missing.
// Keep this file minimal so it's clear that article listing is a separate responsibility.

// Minimal runtime declaration for `process` to satisfy TypeScript in this demo environment.
declare const process: any;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // If Supabase is configured, the implementation should query the `articles` table
    // and support type=date|category|tag (this repo previously had a Supabase placeholder).
    if (!SUPABASE_URL || !SUPABASE_KEY) {
        return res.status(501).json({ message: 'Article listing is not implemented on this deployment. Configure SUPABASE_URL and SUPABASE_KEY to enable.' });
    }

    // If you want, I can implement Supabase queries here. For now, return a helpful message.
    return res.status(501).json({ message: 'Supabase-backed article queries are not implemented yet. Use /api/starred for FreshRSS starred stream.' });
}
