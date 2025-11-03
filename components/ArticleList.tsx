// components/ArticleList.tsx

import React, { memo } from 'react';
import { Article } from '../types';
import { useArticleStore } from '../store/articleStore';

interface ArticleListProps {
  articleIds: (string | number)[]; // Now receives IDs
  onOpenArticle: (article: Article) => void;
  isLoading: boolean;
}

const ArticleList: React.FC<ArticleListProps> = ({ articleIds, onOpenArticle, isLoading }) => {
  // 1. 先处理加载状态
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // 2. 从 Store 中订阅并重构文章列表
  const articlesById = useArticleStore((state) => state.articlesById);
  const articles = articleIds.map(id => articlesById[id]).filter(Boolean) as Article[];

  // 3. 然后处理空状态
  if (articles.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>没有找到文章。</p>
      </div>
    );
  }

  // 4. 最后渲染列表
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">文章列表</h2>
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