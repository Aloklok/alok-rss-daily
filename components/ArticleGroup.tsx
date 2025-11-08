// components/ArticleGroup.tsx

import React from 'react';
import { Article, Tag } from '../types';
import ArticleCard from './ArticleCard';

const DecorativeDivider = () => (
    <div className="flex items-center justify-center my-8">
        <span className="h-px w-20 bg-stone-500"></span>
        <span className="mx-4 text-stone-500 text-lg">◆</span>
        <span className="h-px w-20 bg-stone-500"></span>
    </div>
);

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
<header className="sticky top-0 z-20 mb-4"> 
<div className="backdrop-blur px-4 py-3 bg-gradient-to-b from-[rgba(246,240,224,0.7)] via-[rgba(240,229,201,0.7)] to-[rgba(231,216,172,0.7)] border-b-[2px] border-transparent [border-image:linear-gradient(to_right,#c8b382,#b9975d,#e7d8ac)_1]">
    <h2 className="font-serif font-bold text-[1.35rem] leading-tight text-[#7a1e16]"> 
    {importance} 
    </h2> 
    </div> 
</header>

            <div className="flex flex-col">
                {articles.map((article, index) => (
                    <React.Fragment key={article.id}>
                        <div id={`article-${article.id}`}>
                            <ArticleCard
                                article={article}
                                availableUserTags={availableUserTags}
                                onReaderModeRequest={onReaderModeRequest}
                                onStateChange={onStateChange}
                            />
                        </div>
                        {index < articles.length - 1 && (
                            <DecorativeDivider />
                        )}
                    </React.Fragment>
                ))}
            </div>
        </section>
    );
};

export default ArticleGroup;