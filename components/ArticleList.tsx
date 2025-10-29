import React from 'react';
import { Article } from '../types';

interface ArticleListProps {
  articles: Article[];
  onOpenArticle: (article: Article) => void;
  isLoading: boolean;
}

const ArticleList: React.FC<ArticleListProps> = ({ articles, onOpenArticle, isLoading }) => {
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
    <div className="p-4">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">文章列表</h2>
      <div className="space-y-4">
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

export default ArticleList;
