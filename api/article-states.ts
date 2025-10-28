import type { VercelRequest, VercelResponse } from '@vercel/node';

const GREADER_API_URL = process.env.FRESHRSS_API_URL;
const FRESHRSS_USER = process.env.FRESHRSS_USER;
const FRESHRSS_PASS = process.env.FRESHRSS_PASS;

let authToken: string | null = null;

// This is a simplified auth function. In a real app, you'd share this
// between functions, perhaps in a helper file.
const getAuthToken = async (): Promise<string> => {
    if (authToken) return authToken;
    const params = new URLSearchParams({ Email: FRESHRSS_USER!, Passwd: FRESHRSS_PASS! });
    const response = await fetch(`${GREADER_API_URL}/accounts/ClientLogin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
    });
    if (!response.ok) throw new Error('Authentication failed');
    const data = await response.text();
    const token = data.split('\n').find(line => line.startsWith('Auth='))?.split('=')[1];
    if (!token) throw new Error('Auth token not found');
    authToken = token;
    return token;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { articleIds } = req.body;
    if (!Array.isArray(articleIds) || articleIds.length === 0) {
        return res.status(400).json({ message: 'Invalid or empty articleIds provided' });
    }

    try {
        const token = await getAuthToken();

        // FreshRSS doesn't have a bulk state lookup. We have to fetch all items
        // with their states and then filter. A better approach for performance might be
        // to get all unread IDs and then all starred IDs, but for simplicity, this works.
        // We'll fetch the stream of all item IDs and their states.
        const response = await fetch(`${GREADER_API_URL}/reader/api/0/stream/contents/?output=json`, {
            method: 'GET',
            headers: { 'Authorization': `GoogleLogin auth=${token}` },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch article stream');
        }

        const data = await response.json();
        
        const states: { [key: string]: string[] } = {};
        
        data.items.forEach((item: { id: string; categories: string[] }) => {
            // GReader API sometimes uses a different ID format in the stream vs. other places.
            // A real implementation would need to normalize this. For now, we assume a match.
            const matchingId = articleIds.find(id => item.id.includes(String(id)));
            if (matchingId) {
                states[String(matchingId)] = item.categories || [];
            }
        });

        res.status(200).json(states);

    } catch (error: any) {
        console.error("Error in /api/article-states:", error);
        res.status(500).json({ message: 'Error fetching article states', error: error.message });
    }
}
