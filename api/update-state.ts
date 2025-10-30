import type { VercelRequest, VercelResponse } from '@vercel/node';

const GREADER_API_URL = process.env.FRESHRSS_API_URL;
const AUTH_TOKEN = process.env.FRESHRSS_AUTH_TOKEN;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    if (!GREADER_API_URL || !AUTH_TOKEN) {
        return res.status(500).json({ message: 'Server configuration error: Missing FreshRSS environment variables.' });
    }

    const { articleId, action, isAdding, tagsToAdd, tagsToRemove } = req.body;

    if (!articleId || (!action && (!tagsToAdd || !tagsToRemove))) {
        return res.status(400).json({ message: 'Missing required parameters' });
    }

    try {
        // Step 1: Fetch the short-lived action token from FreshRSS
        const tokenResponse = await fetch(`${GREADER_API_URL}/greader.php/reader/api/0/token`, {
            method: 'GET',
            headers: {
                'Authorization': `GoogleLogin auth=${AUTH_TOKEN}`,
            },
        });

        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            throw new Error(`Failed to fetch action token. Status: ${tokenResponse.status}. Response: ${errorText}`);
        }

        const shortLivedToken = await tokenResponse.text();

        // Step 2: Use the short-lived token to perform the edit-tag action
        const apiPath = `${GREADER_API_URL}/greader.php/reader/api/0/edit-tag`;
        
        const params = new URLSearchParams();
        params.append('i', String(articleId)); // 'i' is the item ID parameter for GReader API
        params.append('T', shortLivedToken.trim()); // Pass the short-lived token

        if (action) { // Handle star/read
            const tagMap = {
                star: 'user/-/state/com.google/starred',
                read: 'user/-/state/com.google/read',
            };
            const tag = tagMap[action as 'star' | 'read'];
            if(tag) {
               params.append(isAdding ? 'a' : 'r', tag);
            }
        }

        if (tagsToAdd && Array.isArray(tagsToAdd) && tagsToAdd.length > 0) {
            tagsToAdd.forEach((tag: string) => params.append('a', tag));
        }
        if (tagsToRemove && Array.isArray(tagsToRemove) && tagsToRemove.length > 0) {
            tagsToRemove.forEach((tag: string) => params.append('r', tag));
        }

        const response = await fetch(apiPath, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `GoogleLogin auth=${AUTH_TOKEN}`,
            },
            body: params.toString(),
        });

        const responseText = await response.text();
        if (!response.ok || responseText.trim() !== 'OK') {
             throw new Error(`Failed to update state. Status: ${response.status}. Response: ${responseText}`);
        }

        res.status(200).json({ success: true });

    } catch (error: any) {
        console.error("Error in /api/update-state:", error);
        res.status(500).json({ message: 'Error updating state', error: error.message });
    }
}