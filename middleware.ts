// middleware.ts

// 【改】移除 from 'next/server' 的导入
// 这是一个与框架无关的 Middleware，Vercel 会自动注入全局的 NextResponse 和 NextRequest 类型

const COOKIE_NAME = 'site_token';

// @ts-ignore Vercel 会在边缘环境中自动提供 Request 类型
export function middleware(request: Request) {
    const accessToken = process.env.ACCESS_TOKEN;

    if (!accessToken) {
        return new Response(
            'Access token is not configured. Please contact the administrator.',
            { status: 500 }
        );
    }

    // 【改】从标准的 URL 对象中获取搜索参数
    const url = new URL(request.url);
    const urlToken = url.searchParams.get('token');

    if (urlToken === accessToken) {
        // 【改】重定向的目标现在从 url.origin 获取
        const response = new Response(null, {
            status: 307, // Temporary Redirect
            headers: {
                'Location': url.origin,
                // 【改】直接在 headers 中设置 Set-Cookie
                'Set-Cookie': `${COOKIE_NAME}=${accessToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${60 * 60 * 24 * 90}`,
            },
        });
        
        return response;
    }

    // 【改】从标准的 request.headers 中获取 Cookie
    const cookieHeader = request.headers.get('cookie');
    const cookies = new Map(cookieHeader?.split('; ').map(c => c.split('=')) || []);
    const cookieToken = cookies.get(COOKIE_NAME);

    if (cookieToken && cookieToken === accessToken) {
        // 【改】使用 new Response(null) 表示继续处理请求
        // Vercel Edge Middleware 中，返回 null 或 undefined 也是继续处理
        return; 
    }

    // 【改】使用标准的 Response 对象返回 403
    return new Response(
        '<h1>403 Forbidden</h1><p>You are not allowed to access this site.</p>',
        {
            status: 403,
            headers: { 'Content-Type': 'text/html' },
        }
    );
}

export const config = {
    matcher: [
        /*
         * 匹配除了 Vercel 系统路径和静态文件之外的所有请求路径
         * 这可以确保 API 路由和所有页面都被保护
         */
        '/((?!api/|_next/|_static/|_vercel/|favicon.ico|sw.js).*)',
    ],
};