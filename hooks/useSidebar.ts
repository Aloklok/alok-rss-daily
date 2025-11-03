// hooks/useSidebar.ts

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useArticleStore } from '../store/articleStore';
import { useStarredArticles } from './useArticles'; // 导入新的 Hook
import { Article } from '../types';

export type ActiveTab = 'filters' | 'calendar';

export const useSidebar = () => {
    const [activeTab, setActiveTab] = useState<ActiveTab>('filters');
    const [starredExpanded, setStarredExpanded] = useState<boolean>(false);
    
    // 1. 使用 useQuery 来获取和管理收藏文章
    const { isLoading: isLoadingStarred, refetch: refreshStarred } = useStarredArticles();
    
    // 2. 从 Zustand Store 中订阅数据
    const starredArticleIds = useArticleStore((state) => state.starredArticleIds);
    const articlesById = useArticleStore((state) => state.articlesById);

    const toggleStarred = useCallback(() => {
        setStarredExpanded(prev => !prev);
    }, []);

    const starredArticles = useMemo(() => {
        return starredArticleIds
            .map(id => articlesById[id])
            .filter(Boolean) as Article[];
    }, [starredArticleIds, articlesById]);

    return {
        activeTab,
        setActiveTab,
        starredExpanded,
        toggleStarred,
        starredArticles,
        isLoadingStarred,
        refreshStarred, // refetch 函数可以直接用作刷新
    };
};