import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// --- Supabase Client ---
let supabase: SupabaseClient;
export function getSupabaseClient(): SupabaseClient {
    if (!supabase) {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !supabaseServiceRoleKey) {
            throw new Error("Supabase environment variables are not configured.");
        }
        supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    }
    return supabase;
}

// --- FreshRSS Client ---
interface FreshRssClient {
    get: <T>(path: string, params?: Record<string, string>) => Promise<T>;
    post: <T>(path: string, body: URLSearchParams) => Promise<T>;
    getActionToken: () => Promise<string>;
}

let freshRssClient: FreshRssClient;
export function getFreshRssClient(): FreshRssClient {
    if (!freshRssClient) {
        const apiUrl = process.env.FRESHRSS_API_URL;
        const authToken = process.env.FRESHRSS_AUTH_TOKEN;
        if (!apiUrl || !authToken) {
            throw new Error("FreshRSS environment variables are not configured.");
        }

        const headers = {
            'Authorization': `GoogleLogin auth=${authToken}`,
        };

        const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
            const url = `${apiUrl}/greader.php/reader/api/0${path}`;
            const response = await fetch(url, { ...options, headers });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`FreshRSS API Error: ${response.status} ${errorText}`);
            }
            if (response.headers.get('Content-Type')?.includes('application/json')) {
                return response.json();
            }
            // @ts-ignore
            return response.text();
        };

        freshRssClient = {
            get: <T>(path: string, params: Record<string, string> = {}): Promise<T> => {
                const url = new URLSearchParams(params);
                return request<T>(`${path}?${url.toString()}`);
            },
            post: <T>(path: string, body: URLSearchParams): Promise<T> => {
                return request<T>(path, {
                    method: 'POST',
                    headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
                    body,
                });
            },
            getActionToken: async (): Promise<string> => {
                const token = await request<string>('/token');
                return token.trim();
            }
        };
    }
    return freshRssClient;
}

// --- API Handler Wrapper ---
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type ApiLogic = (req: VercelRequest, res: VercelResponse) => Promise<void | VercelResponse>;

export function apiHandler(methods: HttpMethod[], logic: ApiLogic) {
    return async (req: VercelRequest, res: VercelResponse) => {
        // Handle CORS preflight
        if (req.method === 'OPTIONS') {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', methods.join(', '));
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            return res.status(204).end();
        }
        res.setHeader('Access-Control-Allow-Origin', '*');

        // Check method
        if (!methods.includes(req.method as HttpMethod)) {
            res.setHeader('Allow', methods.join(', '));
            return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
        }

        // Execute logic
        try {
            await logic(req, res);
        } catch (error: any) {
            console.error(`[API Error] ${req.url}:`, error);
            return res.status(500).json({ message: 'An unexpected error occurred', error: error.message });
        }
    };
}
