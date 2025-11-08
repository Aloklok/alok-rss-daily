// @ts-ignore Vercel 会在边缘环境中自动提供全局类型
export default function middleware(request: Request) {

    const url = new URL(request.url);
    const accessToken = process.env.ACCESS_TOKEN;

    if (!accessToken) {
        return new Response('Access token is not configured.', { status: 500 });
    }

    const urlToken = url.searchParams.get('token');

    // 1. URL Token 鉴权
    if (urlToken === accessToken) {
        const response = new Response(null, {
            status: 307,
            headers: {
                'Location': url.origin, // 重定向到 /
                'Set-Cookie': `site_token=${accessToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${60 * 60 * 24 * 90}`,
            },
        });
        return response;
    }

    // 2. Cookie 鉴权
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
        const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
            const parts = cookie.match(/(.*?)=(.*)$/);
            if (parts) {
                const key = parts[1].trim();
                const value = parts[2].trim();
                acc.set(key, value);
            }
            return acc;
        }, new Map<string, string>());

        const cookieToken = cookies.get('site_token');
        if (cookieToken === accessToken) {
            return; // 鉴权通过，继续请求
        }
    }

    // 3. 鉴权失败
    return new Response(
        '<h1>403 Forbidden</h1><p>有事儿吗？</p>',
        {
            status: 403,
            headers: { 'Content-Type': 'text/html' },
        }
    );
}

// 高性能 + 高安全性的 Matcher
// 它只匹配“页面路由”（不含 . ），而不匹配静态文件
export const config = {
    matcher: [
      '/((?!api/|_vercel/|.+\..+).*)',
    ],
};