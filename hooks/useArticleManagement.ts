import { useState, useCallback } from 'react';
import { Article, BriefingReport, GroupedArticles, Filter } from '../types';
import { editArticleState, editArticleTag, markAllAsRead as apiMarkAllAsRead } from '../services/api';

interface UseArticleManagementProps {
    reports: BriefingReport[];
    setReports: React.Dispatch<React.SetStateAction<BriefingReport[]>>;
    filteredArticles: Article[];
    setFilteredArticles: React.Dispatch<React.SetStateAction<Article[]>>;
    activeFilter: Filter | null;
    timeSlot: 'morning' | 'afternoon' | 'evening' | null;
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

        try {
            const originalArticle = reports
                .flatMap(r => Object.values(r.articles).flat())
                .find(a => a.id === articleId) ||
                filteredArticles.find(a => a.id === articleId);

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

            const normalize = (tag: string) => tag.replace(/\/\d+\//, '/-/');
            const originalUserTags = new Set(originalTags.filter(t => !t.startsWith('user/-/state')).map(normalize));
            const newUserTags = new Set(newTags.filter(t => !t.startsWith('user/-/state')));
            const tagsToAdd = [...newUserTags].filter(t => !originalUserTags.has(t));
            const tagsToRemove = [...originalUserTags].filter(t => !newUserTags.has(t));
            if (tagsToAdd.length > 0 || tagsToRemove.length > 0) {
                await editArticleTag(articleId, tagsToAdd, tagsToRemove);
            }

            // Update state only after successful API calls
            const updatedReports = reports.map(report => ({
                ...report,
                articles: updateArticleTagsInGroups(report.articles, articleId, newTags)
            }));
            const updatedFilteredArticles = updateArticleTagsInList(filteredArticles, articleId, newTags);

            setReports(updatedReports);
            setFilteredArticles(updatedFilteredArticles);

            // The service worker will handle caching automatically. No need for manual cache updates.

        } catch (error) {
            console.error("Failed to update article state. UI will not be changed.", error);
        }
    }, [reports, setReports, filteredArticles, setFilteredArticles]);

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
                return 0; // Return 0 articles marked as read
            }
            
            await apiMarkAllAsRead(finalArticleIds);
            
            const markAsRead = (article: Article) => {
                if (!finalArticleIds.includes(article.id) || article.tags.includes('user/-/state/com.google/read')) {
                    return article;
                }
                return { ...article, tags: [...article.tags, 'user/-/state/com.google/read'] };
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
            
            return finalArticleIds.length; // Return the count of articles marked as read

        } catch (error) {
            console.error("UI: Failed to mark all as read.", error);
            return 0; // Return 0 on error
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
