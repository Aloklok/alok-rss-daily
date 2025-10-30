import type { VercelRequest, VercelResponse } from '@vercel/node';

const GREADER_API_URL = process.env.FRESHRSS_API_URL;
const AUTH_TOKEN = process.env.FRESHRSS_AUTH_TOKEN;

// Mapping from simple action names to the full GReader API tags
const tagMap = {
    star: 'user/-/state/com.google/starred',
    read: 'user/-/state/com.google/read',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    if (!GREADER_API_URL || !AUTH_TOKEN) {
        return res.status(500).json({ message: 'Server configuration error: Missing FreshRSS environment variables.' });
    }

    const { articleId, action, isAdding } = req.body;

    // Validate input
    if (!articleId || !action || typeof isAdding !== 'boolean') {
        return res.status(400).json({ message: 'Missing required parameters: articleId, action, isAdding' });
    }

    const tag = tagMap[action as keyof typeof tagMap];
    if (!tag) {
        return res.status(400).json({ message: 'Invalid action specified.' });
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
        console.log(shortLivedToken.trim())
        // Step 2: Use the short-lived token to perform the edit-tag action
        const apiPath = `${GREADER_API_URL}/greader.php/reader/api/0/edit-tag`;
        
        const params = new URLSearchParams();
        console.log(String(articleId));
        params.append('i', String(articleId));
        params.append('T', shortLivedToken.trim()); // Use the short-lived token here

        if (isAdding) {
            params.append('a', tag);
        } else {
            params.append('r', tag);
        }

        const editResponse = await fetch(apiPath, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `GoogleLogin auth=${AUTH_TOKEN}`,
            },
            body: params.toString(),
        });

        const responseText = await editResponse.text();
        
        if (!editResponse.ok || responseText.trim() !== 'OK') {
             throw new Error(`Failed to update state. Status: ${editResponse.status}. Response: ${responseText}`);
        }

        res.status(200).json({ success: true, message: `Action '${action}' on article '${articleId}' was successful.` });

    } catch (error: any) {
        console.error("Error in /api/edit-article-state:", error);
        res.status(502).json({ message: 'Error communicating with FreshRSS API', error: error.message });
    }
}
