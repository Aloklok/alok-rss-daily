// hooks/useArticleManagement.ts

import { useState, useCallback } from 'react';
import { Article, BriefingReport, GroupedArticles, Filter } from '../types';
import { markAllAsRead as apiMarkAllAsRead } from '../services/api';

interface UseArticleManagementProps {
    reports: BriefingReport[];
    setReports: React.Dispatch<React.SetStateAction<BriefingReport[]>>;
    filteredArticles: Article[];
    setFilteredArticles: React.Dispatch<React.SetStateAction<Article[]>>;
}

// 这个 Hook 现在只负责批量操作，不再关心单个文章的标签/状态更新
export const useArticleManagement = ({
    reports,
    setReports,
    filteredArticles,
    setFilteredArticles,
}: UseArticleManagementProps) => {
    const [isMarkingAsRead, setIsMarkingAsRead] = useState(false);


    const handleMarkAllAsRead = useCallback(async (context: Filter['type'] | 'singleArticle', articleIdsToMark?: (string | number)[]) => {
        setIsMarkingAsRead(true);
        try {
            let finalArticleIds: (string | number)[] = [];

            if (context === 'singleArticle' && articleIdsToMark) {
                finalArticleIds = articleIdsToMark;
            } else if (context === 'date' && reports.length > 0) {
                finalArticleIds = reports.flatMap(report =>
                    Object.values(report.articles).flat().map(article => article.id)
                );
            } else if ((context === 'category' || context === 'tag') && filteredArticles.length > 0) {
                finalArticleIds = filteredArticles.map(article => article.id);
            }

            if (finalArticleIds.length === 0) {
                setIsMarkingAsRead(false);
                return 0;
            }
            
            await apiMarkAllAsRead(finalArticleIds);
            
            const markAsRead = (article: Article) => {
                if (!finalArticleIds.includes(article.id) || (article.tags && article.tags.includes('user/-/state/com.google/read'))) {
                    return article;
                }
                const newTags = article.tags ? [...article.tags, 'user/-/state/com.google/read'] : ['user/-/state/com.google/read'];
                return { ...article, tags: newTags };
            };

            const updatedReports = reports.map(report => ({
                ...report,
                articles: Object.keys(report.articles).reduce((acc, key) => {
                    acc[key] = report.articles[key].map(markAsRead);
                    return acc;
                }, {} as GroupedArticles)
            }));
            setReports(updatedReports);
            
            const updatedFilteredArticles = filteredArticles.map(markAsRead);
            setFilteredArticles(updatedFilteredArticles);
            
            return finalArticleIds.length;

        } catch (error) {
            console.error("UI: Failed to mark all as read.", error);
            return 0;
        } finally {
            setIsMarkingAsRead(false);
        }
    }, [reports, setReports, filteredArticles, setFilteredArticles]);

    return {
        isMarkingAsRead,
        handleMarkAllAsRead,
    };
};