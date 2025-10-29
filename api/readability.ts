import type { VercelRequest, VercelResponse } from '@vercel/node';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import puppeteer from 'puppeteer-core';

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 10000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timeoutId);
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
        return res.status(400).json({ message: 'URL parameter is required.' });
    }

    try {
        new URL(String(url));
    } catch (e) {
        return res.status(400).json({ message: 'Invalid URL format' });
    }

    try {
        console.log('Processing URL:', url);
        const fetchRes = await fetchWithTimeout(String(url), {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36' }
        });

        if (!fetchRes.ok) throw new Error(`Failed to fetch URL with status ${fetchRes.status}`);

        const html = await fetchRes.text();
        const docForReadability = new JSDOM(html, { url: String(url) }).window.document;
        const reader = new Readability(docForReadability, { charThreshold: 100 });
        const article = reader.parse();

        if (article && article.content && article.content.trim().length > 200) {
            console.log('Readability produced full content for URL:', url);
            return res.status(200).json({ title: article.title, content: article.content, source: article.siteName || new URL(String(url)).hostname });
        }

        console.log('Initial Readability attempt failed, trying alternatives...');

        const mainContentText = docForReadability.body?.textContent?.trim() || '';
        const isContentTooShort = mainContentText.length < 250;
        const hasDynamicLoadingHints = /<div[^>]+(id="root"|id="app"|data-reactroot)/.test(html) || html.length < 4000;
        const forcedHeadlessDomains = ['infoq.cn', 'medium.com', 'substack.com', 'notion.site', 'telegraph.co'];
        const currentDomain = new URL(String(url)).hostname;
        const isDomainForced = forcedHeadlessDomains.some(domain => currentDomain.includes(domain));
        const shouldTryHeadless = process.env.ENABLE_HEADLESS_RENDER === '1' && (isDomainForced || (isContentTooShort && hasDynamicLoadingHints));

        console.log('Content analysis:', { contentTextLength: mainContentText.length, shouldTryHeadless });

        if (shouldTryHeadless) {
            let browser: any = null;
            try {
                console.log('Attempting headless render...');
                let launchOptions: any;

                if (process.env.VERCEL_ENV) {
                    console.log('Using @sparticuz/chromium for production');
                    const chromium = (await import('@sparticuz/chromium')).default;
                    
                    launchOptions = {
                        executablePath: await chromium.executablePath(),
                        args: chromium.args,
                        headless: "new" as any,
                        defaultViewport: { width: 1280, height: 720 },
                    };
                } else {
                    console.log('Using local puppeteer for development');
                    const localPuppeteer = (await import('puppeteer')).default;
                    launchOptions = {
                        executablePath: localPuppeteer.executablePath(),
                        headless: "new" as any,
                        args: ['--no-sandbox', '--disable-setuid-sandbox']
                    };
                }

                browser = await puppeteer.launch(launchOptions);
                const page = await browser.newPage();
                await page.setRequestInterception(true);
                page.on('request', (req: any) => { // 这里的 HTTPRequest 类型现在是明确导入的
                    if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
                        req.abort();
                    } else {
                        req.continue();
                    }
                });

                await page.goto(String(url), { waitUntil: 'domcontentloaded', timeout: 8000 });
                const renderedHtml = await page.content();
                console.log('Got rendered content, length:', renderedHtml.length);

                const renderedDoc = new JSDOM(renderedHtml, { url: String(url) }).window.document;
                const renderedReader = new Readability(renderedDoc, { charThreshold: 100 });
                const renderedArticle = renderedReader.parse();

                if (renderedArticle && renderedArticle.content && renderedArticle.content.trim().length > 200) {
                    console.log('Successfully extracted content from rendered page');
                    return res.status(200).json({ title: renderedArticle.title, content: renderedArticle.content, source: renderedArticle.siteName || new URL(String(url)).hostname });
                }

                throw new Error('Could not extract meaningful content after headless rendering');
            } catch (err: any) {
                console.error('Headless rendering failed:', err.message);
            } finally {
                if (browser) await browser.close();
            }
        }

        throw new Error('Could not extract meaningful content from the article');
    } catch (error: any) {
        console.error(`Error processing article from ${url}:`, error.message);
        let statusCode = 500;
        let errorMessage = '处理文章时发生错误';
        if (error.message.includes('timeout')) {
            statusCode = 504; errorMessage = '请求目标网站超时';
        } else if (error.message.includes('status 403')) {
            statusCode = 403; errorMessage = '目标网站拒绝访问';
        } else if (error.message.includes('Could not extract')) {
            statusCode = 422; errorMessage = '无法从此页面提取有效内容';
        }
        return res.status(statusCode).json({ message: errorMessage });
    }
}