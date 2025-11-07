// middleware.ts

// @ts-ignore Vercel 会在边缘环境中自动提供全局类型
export default function middleware(request: Request) {
  const accessToken = process.env.ACCESS_TOKEN;

  if (!accessToken) {
      return new Response('Access token is not configured.', { status: 500 });
  }

  const url = new URL(request.url);
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

export const config = {
  matcher: [
      /*
       * 匹配除了 Vercel 系统路径和静态文件之外的所有请求路径
       */
      '/((?!api/|_next/|_static/|_vercel/|favicon.ico|sw.js).*)',
  ],
};