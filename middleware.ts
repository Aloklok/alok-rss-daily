// middleware.ts

// @ts-ignore Vercel 会在边缘环境中自动提供全局类型
export default function middleware(request: Request) {

    const url = new URL(request.url);

    // --- 【核心修复】开始：添加白名单 ---
    // 定义我们不希望被保护的公共路径或文件扩展名
    const publicPaths = [
        // PWA 相关文件
        '/manifest.webmanifest',
        '/sw.js',
        '/registerSW.js',
        // 静态资源（图标、字体等）
        '.ico',
        '.png',
        '.jpg',
        '.jpeg',
        '.svg',
    ];

    // 如果请求的路径是白名单中的一项，或者以白名单中的扩展名结尾，则直接放行
    if (publicPaths.some(path => url.pathname.endsWith(path))) {
        return; // 继续处理请求，不进行认证检查
    }
    // --- 核心修复结束 ---


  const accessToken = process.env.ACCESS_TOKEN;

  if (!accessToken) {
      return new Response('Access token is not configured.', { status: 500 });
  }

  const urlToken = url.searchParams.get('token');

  if (urlToken === accessToken) {
      const response = new Response(null, {
          status: 307,
          headers: {
              'Location': url.origin,
              'Set-Cookie': `site_token=${accessToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${60 * 60 * 24 * 90}`,
          },
      });
      return response;
  }

  // --- 【核心修复】开始：更健壮的 Cookie 解析 ---
  const cookieHeader = request.headers.get('cookie');
  let hasValidCookie = false;

  if (cookieHeader) {
      // 使用更可靠的方式解析 cookie 字符串
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
          hasValidCookie = true;
      }
  }
  // --- 核心修复结束 ---

  if (hasValidCookie) {
      // 返回 undefined (或 null) 来继续请求链
      return;
  }

  return new Response(
      '<h1>403 Forbidden</h1><p>You are not allowed to access this site.</p>',
      {
          status: 403,
          headers: { 'Content-Type': 'text/html' },
      }
  );
}
// 【改】放宽 matcher，让 middleware 检查更多请求
// 我们现在依赖函数内部的白名单来放行，而不是依赖 matcher
export const config = {
    matcher: [
      '/((?!api/|_vercel/).*)',
    ],
};