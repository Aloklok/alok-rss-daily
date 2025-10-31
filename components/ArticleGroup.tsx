import React from 'react';
import { Article, Tag } from '../types';
import ArticleCard from './ArticleCard'; // Assuming ArticleCard is in the same directory and exported

interface ArticleGroupProps {
    importance: string;
    articles: Article[];
    availableTags: Tag[];
    onReaderModeRequest: (article: Article) => void;
    onStateChange: (articleId: string | number, newTags: string[]) => Promise<void>;
}

const importanceStyles: { [key: string]: { emoji: string; bg: string; text: string; border: string } } = {
    '重要新闻': { emoji: '🚨', bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200' },
    '必知要闻': { emoji: '🔥', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
    '常规更新': { emoji: '📰', bg: 'bg-sky-50', text: 'text-sky-800', border: 'border-sky-200' },
};

const DecorativeDivider = () => (
    <div className="flex items-center justify-center my-8">
        <span className="h-px w-20 bg-stone-200"></span>
        <span className="mx-4 text-stone-300 text-lg">◆</span>
        <span className="h-px w-20 bg-stone-200"></span>
    </div>
);

const ArticleGroup: React.FC<ArticleGroupProps> = ({
    importance,
    articles,
    availableTags,
    onReaderModeRequest,
    onStateChange,
}) => {
    if (!articles || articles.length === 0) return null;

    const sectionId = `importance-${importance.replace(/\s+/g, '-')}`;
    const styles = importanceStyles[importance];

    return (
        <section id={sectionId} className="scroll-mt-20">
            <h2 className={`flex items-center gap-x-3 text-3xl font-bold font-serif p-4 rounded-lg ${styles.bg} ${styles.text} border-l-4 ${styles.border}`}>
                <span>{styles.emoji}</span>
                {importance}
            </h2>
            <div className="mt-0">
                {articles.map((article, index) => (
                    <div key={article.id} id={`article-${article.id}`} className="scroll-mt-24">
                        <ArticleCard
                            article={article}
                            availableTags={availableTags}
                            onReaderModeRequest={onReaderModeRequest}
                            onStateChange={onStateChange}
                        />
                        {index < articles.length - 1 && <DecorativeDivider />}
                    </div>
                ))}
            </div>
        </section>
    );
};

export default ArticleGroup;
