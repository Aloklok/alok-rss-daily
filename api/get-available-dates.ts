import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client securely on the server side
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Supabase environment variables are not configured.");
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        // We use a raw query here because it's more efficient to let PostgreSQL handle
        // the date extraction and distinct filtering.
        // The query does the following:
        // 1. CAST(n8n_processing_date AS DATE): Converts the full timestamp into just a date (e.g., '2025-10-28').
        // 2. AS article_date: Gives the resulting date column a name.
        // 3. DISTINCT ON (article_date): Selects only the unique dates.
        // 4. ORDER BY article_date DESC: Sorts the unique dates from newest to oldest.
        const { data, error } = await supabase
            .from('articles')
            .select('n8n_processing_date')
            .order('n8n_processing_date', { ascending: false });

        if (error) {
            console.error('Supabase error in get-available-dates:', error);
            return res.status(500).json({ message: 'Error fetching available dates', error: error.message });
        }

        // Process the data to get unique dates based on the Asia/Shanghai timezone
        const dateSet = new Set<string>();
        if (data) {
            // Create a formatter that will give us the date in YYYY-MM-DD format for the Shanghai timezone
            const formatter = new Intl.DateTimeFormat('en-CA', { // en-CA format is YYYY-MM-DD
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                timeZone: 'Asia/Shanghai',
            });

            data.forEach(item => {
                if (item.n8n_processing_date) {
                    const date = new Date(item.n8n_processing_date);
                    // Format the date according to Shanghai's timezone
                    dateSet.add(formatter.format(date));
                }
            });
        }

        const dates = Array.from(dateSet);

        return res.status(200).json(dates);

    } catch (error: any) {
        console.error('Handler error in get-available-dates:', error);
        return res.status(500).json({ message: 'An unexpected error occurred', error: error.message });
    }
}
