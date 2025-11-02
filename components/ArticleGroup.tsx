// components/ArticleGroup.tsx

import React from 'react';
import { Article, Tag } from '../types';
import ArticleCard from './ArticleCard';

interface ArticleGroupProps {
    importance: string;
    articles: Article[];
    availableUserTags: Tag[];
    onReaderModeRequest: (article: Article) => void;
    onStateChange: (articleId: string | number, tagsToAdd: string[], tagsToRemove: string[]) => Promise<void>;
}

const ArticleGroup: React.FC<ArticleGroupProps> = ({ importance, articles, availableUserTags, onReaderModeRequest, onStateChange }) => {
    if (!articles || articles.length === 0) {
        return null;
    }

    const sectionId = `importance-${importance.replace(/\s+/g, '-')}`;

    return (
        <section id={sectionId} className="mb-12">
            <header className="sticky top-0 bg-stone-50/80 backdrop-blur-md z-10 py-4 mb-4 border-b-2 border-stone-200">
                <h2 className="text-2xl font-bold font-serif text-stone-800">{importance}</h2>
            </header>
            <div className="space-y-12">
                {articles.map(article => (
                    <div id={`article-${article.id}`} key={article.id}>
                        <ArticleCard
                            article={article}
                            availableUserTags={availableUserTags}
                            onReaderModeRequest={onReaderModeRequest}
                            onStateChange={onStateChange}
                        />
                    </div>
                ))}
            </div>
        </section>
    );
};

export default ArticleGroup;