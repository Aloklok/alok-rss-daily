import type { VercelRequest, VercelResponse } from '@vercel/node';

const GREADER_API_URL = process.env.FRESHRSS_API_URL;
const FRESHRSS_USER = process.env.FRESHRSS_USER;
const FRESHRSS_PASS = process.env.FRESHRSS_PASS;

let authToken: string | null = null;

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

    const { articleId, action, isAdding, tagsToAdd, tagsToRemove } = req.body;

    if (!articleId || (!action && (!tagsToAdd || !tagsToRemove))) {
        return res.status(400).json({ message: 'Missing required parameters' });
    }

    try {
        const token = await getAuthToken();
        const apiPath = `${GREADER_API_URL}/reader/api/0/edit-tag`;
        
        const params = new URLSearchParams();
        params.append('i', String(articleId)); // 'i' is the item ID parameter for GReader API
        params.append('T', token);

        if (action) { // Handle star/read
            const tagMap = {
                star: 'user/-/state/com.google/starred',
                read: 'user/-/state/com.google/read',
            };
            const tag = tagMap[action as 'star' | 'read'];
            params.append(isAdding ? 'a' : 'r', tag);
        }

        if (tagsToAdd && tagsToAdd.length > 0) {
            tagsToAdd.forEach((tag: string) => params.append('a', tag));
        }
        if (tagsToRemove && tagsToRemove.length > 0) {
            tagsToRemove.forEach((tag: string) => params.append('r', tag));
        }

        const response = await fetch(apiPath, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params,
        });

        if (!response.ok || (await response.text()) !== 'OK') {
             throw new Error(`Failed to update state. Status: ${response.status}`);
        }

        res.status(200).json({ success: true });

    } catch (error: any) {
        console.error("Error in /api/update-state:", error);
        res.status(500).json({ message: 'Error updating state', error: error.message });
    }
}
