import { useState, useCallback } from 'react';
import { Article, BriefingReport, GroupedArticles } from '../types';
import { editArticleState, editArticleTag, markAllAsRead as apiMarkAllAsRead } from '../services/api';

interface UseArticleManagementProps {
    reports: BriefingReport[];
    setReports: React.Dispatch<React.SetStateAction<BriefingReport[]>>;
    filteredArticles: Article[];
    setFilteredArticles: React.Dispatch<React.SetStateAction<Article[]>>;
}

export const useArticleManagement = ({
    reports,
    setReports,
    filteredArticles,
    setFilteredArticles,
}: UseArticleManagementProps) => {
    const [isMarkingAsRead, setIsMarkingAsRead] = useState(false);

    const handleArticleStateChange = useCallback(async (articleId: string | number, newTags: string[]) => {
        const updateArticleTagsInGroups = (groups: GroupedArticles, id: string | number, tags: string[]) => {
            const newGroups = { ...groups };
            for (const importance in newGroups) {
                newGroups[importance] = newGroups[importance].map(article =>
                    article.id === id ? { ...article, tags } : article
                );
            }
            return newGroups;
        };

        const updateArticleTagsInList = (articles: Article[], id: string | number, tags: string[]) => {
            return articles.map(article =>
                article.id === id ? { ...article, tags } : article
            );
        };

        const originalReports = reports;
        const originalFilteredArticles = filteredArticles;

        setReports(prevReports => prevReports.map(report => ({
            ...report,
            articles: updateArticleTagsInGroups(report.articles, articleId, newTags)
        })));
        setFilteredArticles(prevArticles => updateArticleTagsInList(prevArticles, articleId, newTags));

        try {
            const originalArticle = originalReports
                .flatMap(r => Object.values(r.articles).flat())
                .find(a => a.id === articleId) ||
                originalFilteredArticles.find(a => a.id === articleId);

            const originalTags: string[] = originalArticle?.tags || [];
            
            const isNowStarred = newTags.includes('user/-/state/com.google/starred');
            const wasStarred = originalTags.includes('user/-/state/com.google/starred');
            if (isNowStarred !== wasStarred) {
                await editArticleState(articleId, 'star', isNowStarred);
            }

            const isNowRead = newTags.includes('user/-/state/com.google/read');
            const wasRead = originalTags.includes('user/-/state/com.google/read');
            if (isNowRead !== wasRead) {
                await editArticleState(articleId, 'read', isNowRead);
            }

            const originalUserTags = new Set(originalTags.filter(t => !t.startsWith('user/-/state')));
            const newUserTags = new Set(newTags.filter(t => !t.startsWith('user/-/state')));
            const tagsToAdd = [...newUserTags].filter(t => !originalUserTags.has(t));
            const tagsToRemove = [...originalUserTags].filter(t => !newUserTags.has(t));
            if (tagsToAdd.length > 0 || tagsToRemove.length > 0) {
                await editArticleTag(articleId, tagsToAdd, tagsToRemove);
            }

        } catch (error) {
            console.error("Failed to update article state, rolling back.", error);
            setReports(originalReports);
            setFilteredArticles(originalFilteredArticles);
        }
    }, [reports, setReports, filteredArticles, setFilteredArticles]);

    const handleMarkAllAsRead = useCallback(async (activeFilterType: Filter['type']) => {
        setIsMarkingAsRead(true);
        try {
            let articleIds: (string | number)[] = [];
            
            if (activeFilterType === 'date' && reports.length > 0) {
                articleIds = reports.flatMap(report => 
                    Object.values(report.articles).flat().map(article => article.id)
                );
            } else if (filteredArticles.length > 0) {
                articleIds = filteredArticles.map(article => article.id);
            }
            
            await apiMarkAllAsRead(articleIds);
            
            if (activeFilterType === 'date' && reports.length > 0) {
                setReports(prevReports => 
                    prevReports.map(report => ({
                        ...report,
                        articles: Object.keys(report.articles).reduce((acc, key) => {
                            acc[key] = report.articles[key].map(article => {
                                if (!articleIds.includes(article.id) || article.tags.includes('user/-/state/com.google/read')) {
                                    return article;
                                }
                                return { ...article, tags: [...article.tags, 'user/-/state/com.google/read'] };
                            });
                            return acc;
                        }, {} as GroupedArticles)
                    }))
                );
            }
            
            if (filteredArticles.length > 0) {
                setFilteredArticles(prevArticles => 
                    prevArticles.map(article => {
                        if (!articleIds.includes(article.id) || article.tags.includes('user/-/state/com.google/read')) {
                            return article;
                        }
                        return { ...article, tags: [...article.tags, 'user/-/state/com.google/read'] };
                    })
                );
            }
        } catch (error) {
            console.error("UI: Failed to mark all as read.", error);
        } finally {
            setIsMarkingAsRead(false);
        }
    }, [reports, setReports, filteredArticles, setFilteredArticles]);

    return {
        isMarkingAsRead,
        handleArticleStateChange,
        handleMarkAllAsRead,
    };
};
