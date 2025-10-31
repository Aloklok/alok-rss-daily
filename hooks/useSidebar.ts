import { useState, useCallback } from 'react';
import { Article } from '../types';
import { getStarredArticles } from '../services/api';

export type ActiveTab = 'filters' | 'calendar';

export const useSidebar = () => {
    const [activeTab, setActiveTab] = useState<ActiveTab>('filters');
    const [starredExpanded, setStarredExpanded] = useState<boolean>(false);
    const [starredArticles, setStarredArticles] = useState<Article[]>([]);
    const [isLoadingStarred, setIsLoadingStarred] = useState<boolean>(false);

    const toggleStarred = useCallback(async () => {
        const newExpandedState = !starredExpanded;
        setStarredExpanded(newExpandedState);

        // Only fetch starred articles when expanding for the first time
        if (newExpandedState && starredArticles.length === 0) {
            setIsLoadingStarred(true);
            try {
                const data = await getStarredArticles();
                setStarredArticles(data);
            } catch (e) {
                console.error('Failed to load starred articles on expand', e);
            } finally {
                setIsLoadingStarred(false);
            }
        }
    }, [starredExpanded, starredArticles.length]);

    const refreshStarred = useCallback(async () => {
        setIsLoadingStarred(true);
        try {
            const data = await getStarredArticles();
            setStarredArticles(data);
        } catch (e) {
            console.error('Failed to refresh starred articles', e);
        } finally {
            setIsLoadingStarred(false);
        }
    }, []);

    return {
        activeTab,
        setActiveTab,
        starredExpanded,
        toggleStarred,
        starredArticles,
        isLoadingStarred,
        refreshStarred,
    };
};
