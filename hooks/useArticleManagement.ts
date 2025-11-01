import { useState, useCallback } from 'react';
import { Article, BriefingReport, GroupedArticles, Filter } from '../types';
import { editArticleState, editArticleTag, markAllAsRead as apiMarkAllAsRead } from '../services/api';
import { getCacheKey } from './useDataFetching'; // Import getCacheKey

interface UseArticleManagementProps {
    reports: BriefingReport[];
    setReports: React.Dispatch<React.SetStateAction<BriefingReport[]>>;
    filteredArticles: Article[];
    setFilteredArticles: React.Dispatch<React.SetStateAction<Article[]>>;
    activeFilter: Filter | null; // Add activeFilter
    timeSlot: 'morning' | 'afternoon' | 'evening' | null; // Add timeSlot
}

export const useArticleManagement = ({
    reports,
    setReports,
    filteredArticles,
    setFilteredArticles,
    activeFilter,
    timeSlot,
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

            // Update sessionStorage cache
            if (activeFilter) {
                const cacheKey = getCacheKey(activeFilter, timeSlot);
                if (cacheKey) {
                    if (activeFilter.type === 'date') {
                        sessionStorage.setItem(cacheKey, JSON.stringify({ reports: updatedReports, selectedReportId: reports.length > 0 ? reports[0].id : null }));
                    } else if (activeFilter.type === 'category' || activeFilter.type === 'tag') {
                        sessionStorage.setItem(cacheKey, JSON.stringify({ articles: updatedFilteredArticles }));
                    }
                    console.log(`useArticleManagement: Updated cache for ${cacheKey} after state change.`);
                }
            }

        } catch (error) {
            console.error("Failed to update article state. UI will not be changed.", error);
        }
    }, [reports, setReports, filteredArticles, setFilteredArticles, activeFilter, timeSlot]);

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
            
            let updatedReports = reports;
            let updatedFilteredArticles = filteredArticles;

            if (activeFilterType === 'date' && reports.length > 0) {
                updatedReports = prevReports => 
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
                    }));
                setReports(updatedReports);
            }
            
            if (filteredArticles.length > 0) {
                updatedFilteredArticles = prevArticles => 
                    prevArticles.map(article => {
                        if (!articleIds.includes(article.id) || article.tags.includes('user/-/state/com.google/read')) {
                            return article;
                        }
                        return { ...article, tags: [...article.tags, 'user/-/state/com.google/read'] };
                    })
                ;
                setFilteredArticles(updatedFilteredArticles);
            }

            // Update sessionStorage cache
            if (activeFilter) {
                const cacheKey = getCacheKey(activeFilter, timeSlot);
                if (cacheKey) {
                    if (activeFilter.type === 'date') {
                        sessionStorage.setItem(cacheKey, JSON.stringify({ reports: updatedReports, selectedReportId: reports.length > 0 ? reports[0].id : null }));
                    } else if (activeFilter.type === 'category' || activeFilter.type === 'tag') {
                        sessionStorage.setItem(cacheKey, JSON.stringify({ articles: updatedFilteredArticles }));
                    }
                    console.log(`useArticleManagement: Updated cache for ${cacheKey} after marking all as read.`);
                }
            }

        } catch (error) {
            console.error("UI: Failed to mark all as read.", error);
        } finally {
            setIsMarkingAsRead(false);
        }
    }, [reports, setReports, filteredArticles, setFilteredArticles, activeFilter, timeSlot]);

    return {
        isMarkingAsRead,
        handleArticleStateChange,
        handleMarkAllAsRead,
    };
};
