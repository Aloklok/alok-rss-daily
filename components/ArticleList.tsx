// components/ArticleList.tsx

import React, { memo, useMemo } from 'react';
import { Article, Filter } from '../types';
import { useArticleStore } from '../store/articleStore';

interface ArticleListProps {
  articleIds: (string | number)[];
  onOpenArticle: (article: Article) => void;
  isLoading: boolean;
  activeFilter: Filter | null;
}

const GRADIENTS = [
    'from-rose-400 via-fuchsia-500 to-indigo-500', 'from-green-400 via-cyan-500 to-blue-500',
    'from-amber-400 via-orange-500 to-red-500', 'from-teal-400 via-sky-500 to-purple-500',
    'from-lime-400 via-emerald-500 to-cyan-500'
];

const ArticleList: React.FC<ArticleListProps> = ({ articleIds, onOpenArticle, isLoading, activeFilter }) => {
  const articlesById = useArticleStore((state) => state.articlesById);
  const articles = articleIds.map(id => articlesById[id]).filter(Boolean) as Article[];

  const randomGradient = useMemo(() => {
    if (!activeFilter) return GRADIENTS[0];
    const hash = activeFilter.value.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
    return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
  }, [activeFilter]);

  const filterLabel = useMemo(() => {
    if (!activeFilter) return '文章';
    const parts = activeFilter.value.split('/');
    const lastPart = parts[parts.length - 1];
    return decodeURIComponent(lastPart);
  }, [activeFilter]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>没有找到文章。</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 lg:p-10">
      <header className={`relative mb-6 md:mb-12 bg-gradient-to-br ${randomGradient} rounded-2xl p-4 md:p-8 text-white shadow-lg`}>
        <h1 className="text-4xl md:text-5xl font-serif font-bold leading-none tracking-tight">
          {filterLabel}
        </h1>
      </header>
      <div className="space-y-0.5">
        {articles.map((article) => (
          <div
            key={article.id}
            className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer"
            onClick={() => onOpenArticle(article)}
          >
            <h3 className="text-lg font-semibold text-gray-800">{article.title}</h3>
            <p className="text-sm text-gray-600">来源: {article.sourceName}</p>
            <p className="text-xs text-gray-500">发布日期: {new Date(article.published).toLocaleDateString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default memo(ArticleList);