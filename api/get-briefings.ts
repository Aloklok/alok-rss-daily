import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Article } from '../types'; // Adjust the path based on your project structure

// Initialize Supabase client securely on the server side
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Supabase environment variables (URL and service role key) are not configured.");
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

type TimeSlot = 'morning' | 'afternoon' | 'evening';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { date, slot } = req.query;

    if (!date || typeof date !== 'string') {
        return res.status(400).json({ message: 'Date parameter is required.' });
    }

    try {
        let data: Article[] = [];
        let error: any = null;

        const makeRange = (start: string, end: string) => ({ start, end });

        let ranges: Array<{ start: string; end: string }>;
        if (!slot) {
            ranges = [makeRange(`${date}T00:00:00.000+08:00`, `${date}T23:59:59.999+08:00`)];
        } else if (slot === 'morning') {
            ranges = [makeRange(`${date}T00:00:00.000+08:00`, `${date}T11:59:59.999+08:00`)];
        } else if (slot === 'afternoon') {
            ranges = [makeRange(`${date}T12:00:00.000+08:00`, `${date}T17:59:59.999+08:00`)];
        } else { // evening
            ranges = [makeRange(`${date}T18:00:00.000+08:00`, `${date}T23:59:59.999+08:00`)];
        }

        for (const r of ranges) {
            const { data: chunk, error: err } = await supabase
                .from('articles')
                .select('*')
                .gte('crawlTime', r.start)
                .lte('crawlTime', r.end);
            
            if (err) {
                error = err;
                break;
            }
            if (chunk && chunk.length > 0) {
                data = data.concat(chunk as any);
            }
        }

        if (error) {
            console.error('Supabase error:', error);
            return res.status(500).json({ message: 'Error fetching articles from Supabase', error: error.message });
        }

        if (!data || data.length === 0) {
            return res.status(200).json([]);
        }

        // Deduplicate by id, then sort by crawlTime descending
        const uniqueById = new Map<string | number, Article>();
        data.forEach((a) => {
            uniqueById.set(a.id, a);
        });
        const deduped = Array.from(uniqueById.values());
        const sortedArticles = deduped.sort((a: Article, b: Article) => {
            const aTime = new Date(a.crawlTime || a.published).getTime();
            const bTime = new Date(b.crawlTime || b.published).getTime();
            return bTime - aTime;
        });

        return res.status(200).json(sortedArticles);

    } catch (error: any) {
        console.error('Handler error:', error);
        return res.status(500).json({ message: 'An unexpected error occurred', error: error.message });
    }
}
