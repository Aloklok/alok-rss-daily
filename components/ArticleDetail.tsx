import React, { useEffect, useState } from 'react';
import { Article, CleanArticleContent } from '../types';
import { getCleanArticleContent } from '../services/api';

interface ArticleDetailProps {
  article: Article;
  onClose?: () => void;
}

function stripLeadingTitle(contentHtml: string, title: string): string {
  if (!contentHtml || !title) return contentHtml;
  try {
    // If content starts with an <h1> that contains the title, remove that node
    const lower = contentHtml.toLowerCase();
    const titleLower = title.toLowerCase().trim();

    // Quick heuristic: if an <h1> appears before the first <p> and includes the title, strip it
    const h1Match = contentHtml.match(/^\s*<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (h1Match && h1Match[1]) {
      const h1Text = h1Match[1].replace(/<[^>]+>/g, '').toLowerCase().trim();
      if (h1Text && (h1Text === titleLower || h1Text.includes(titleLower) || titleLower.includes(h1Text))) {
        return contentHtml.replace(h1Match[0], '');
      }
    }

    // If content begins with the bare title as text, remove it
    const textStart = contentHtml.replace(/^\s+/, '');
    if (textStart.toLowerCase().startsWith(titleLower)) {
      return contentHtml.replace(new RegExp('^\\s*' + title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), '');
    }
  } catch (e) {
    // ignore and return original
    console.error('stripLeadingTitle error', e);
  }
  return contentHtml;
}

const ArticleDetail: React.FC<ArticleDetailProps> = ({ article, onClose }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [content, setContent] = useState<CleanArticleContent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isSentinel = article.link === 'about:blank' || String(article.id).startsWith('empty-');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      // If this is the sentinel empty article, skip any fetch and render blank.
      if (isSentinel) {
        if (!mounted) return;
        setIsLoading(false);
        setError(null);
        setContent(null);
        return;
      }

      setIsLoading(true);
      setError(null);
      setContent(null);
      try {
        // Use the article.link (mapped from FreshRSS) as the canonical URL to fetch readability content
        const url = article.link;
        const data = await getCleanArticleContent({ ...article, link: url });
        if (!mounted) return;

        // If Readability returned empty or extremely short content, fall back to FreshRSS summary
        let contentHtml = (data && data.content) || '';
        const hasUsefulContent = contentHtml && contentHtml.trim().length > 40;

        if (!hasUsefulContent) {
          // Prefer the FreshRSS-provided summary (if available) so the user still sees something
          if (article.summary && article.summary.trim().length > 0) {
            contentHtml = article.summary;
          } else {
            // Last resort: provide a simple link to the original article
            contentHtml = `<p>无法从目标站点提取可读内容。您可以点击下面的链接查看原文：</p><p><a href="${article.link}" target="_blank" rel="noopener noreferrer">打开原文</a></p>`;
          }
        }

        // Ensure title is used as heading and strip it from content if Readability included it
        const cleanedHtml = stripLeadingTitle(contentHtml, (data && data.title) || article.title || '');
        setContent({ title: (data && data.title) || article.title, source: (data && data.source) || article.sourceName, content: cleanedHtml });
      } catch (e: any) {
        console.error('ArticleDetail fetch error', e);
        if (mounted) setError(e.message || 'Failed to load article');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [article]);

  return (
    <div className="p-8">
      {isLoading ? (
        <div className="flex items-center justify-center h-80">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="p-8 text-center text-red-600">
          <p>无法加载文章：{error}</p>
          <div className="mt-4">
            <a href={article.link} target="_blank" rel="noopener noreferrer" className="text-blue-600">在新标签页打开原文</a>
          </div>
        </div>
      ) : content ? (
        <article>
          <header className="mb-6">
            <h1 className="text-3xl md:text-4xl font-bold font-serif text-gray-900 mb-2">{content.title || article.title}</h1>
            <p className="text-sm text-gray-500">来源: {content.source || article.sourceName}</p>
          </header>
          <div className="prose prose-lg max-w-none text-gray-800 leading-relaxed" dangerouslySetInnerHTML={{ __html: content.content }} />
        </article>
      ) : (
        <div className="text-gray-500">无内容可显示</div>
      )}
    </div>
  );
};

export default ArticleDetail;
