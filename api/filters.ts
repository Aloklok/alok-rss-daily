import type { VercelRequest, VercelResponse } from '@vercel/node';

const GREADER_API_URL = process.env.FRESHRSS_API_URL;
const FRESHRSS_USER = process.env.FRESHRSS_USER;
const FRESHRSS_PASS = process.env.FRESHRSS_PASS;

let authToken: string | null = null;

const getAuthToken = async (): Promise<string> => {
    if (authToken) {
        return authToken;
    }

    if (!GREADER_API_URL || !FRESHRSS_USER || !FRESHRSS_PASS) {
        throw new Error('Missing FreshRSS environment variables');
    }

    const params = new URLSearchParams();
    params.append('Email', FRESHRSS_USER);
    params.append('Passwd', FRESHRSS_PASS);

    const response = await fetch(`${GREADER_API_URL}/accounts/ClientLogin`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
    });

    if (!response.ok) {
        throw new Error('Authentication failed');
    }

    const data = await response.text();
    const authLine = data.split('\n').find(line => line.startsWith('Auth='));
    if (!authLine) {
        throw new Error('Auth token not found in response');
    }

    const token = authLine.split('=')[1];
    authToken = token;
    return token;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        const token = await getAuthToken();
        const response = await fetch(`${GREADER_API_URL}/reader/api/0/tag/list?output=json`, {
            method: 'GET',
            headers: {
                'Authorization': `GoogleLogin auth=${token}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch tags and categories');
        }

        const data = await response.json();

        const categories: string[] = [];
        const tags: string[] = [];

        data.tags.forEach((item: { id: string; type: string }) => {
            const label = decodeURIComponent(item.id.split('/').pop() || '');
            if (item.type === 'folder') {
                categories.push(label);
            } else if (item.type === 'tag' && !item.id.includes('/state/com.google/')) {
                tags.push(label);
            }
        });
        
        res.status(200).json({
            categories: categories.sort(),
            tags: tags.sort(),
        });

    } catch (error: any) {
        console.error("Error in /api/filters:", error);
        res.status(500).json({ message: 'Error fetching filters', error: error.message });
    }
}
