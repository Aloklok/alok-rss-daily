// hooks/useSidebar.ts

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'; // 导入 useRef
import { Article } from '../types';
import { getStarredArticles, getArticlesDetails } from '../services/api';
import { useArticleStore } from '../store/articleStore';

// --- 数据融合辅助函数 (保持不变) ---
async function mergeArticlesWithDetails(freshArticles: Article[]): Promise<Article[]> {
    if (!freshArticles || freshArticles.length === 0) return [];
    const articleIds = freshArticles.map(a => a.id);
    const supaDetailsById = await getArticlesDetails(articleIds);
    return freshArticles.map(freshArticle => {
        const supaDetails = supaDetailsById[freshArticle.id];
        return supaDetails ? { ...supaDetails, ...freshArticle } : freshArticle;
    });
}

export type ActiveTab = 'filters' | 'calendar';

export const useSidebar = () => {
    const [activeTab, setActiveTab] = useState<ActiveTab>('filters');
    const [starredExpanded, setStarredExpanded] = useState<boolean>(false);
    const [isLoadingStarred, setIsLoadingStarred] = useState<boolean>(false);
    
    // 【核心修复】创建一个 ref 来跟踪初始 fetch 是否已经完成
    const initialFetchDone = useRef(false);

    const addArticles = useArticleStore((state) => state.addArticles);
    const setStarredArticleIds = useArticleStore((state) => state.setStarredArticleIds);
    const starredArticleIds = useArticleStore((state) => state.starredArticleIds);
    const articlesById = useArticleStore((state) => state.articlesById);

    const fetchAndStoreStarred = useCallback(async () => {
        if (isLoadingStarred) return;
        setIsLoadingStarred(true);
        try {
            const freshArticles = await getStarredArticles();
            const mergedArticles = await mergeArticlesWithDetails(freshArticles);
            
            addArticles(mergedArticles);
            setStarredArticleIds(mergedArticles.map(a => a.id));
        } catch (e) {
            console.error('Failed to load starred articles', e);
        } finally {
            setIsLoadingStarred(false);
        }
    }, [addArticles, setStarredArticleIds, isLoadingStarred]);

    useEffect(() => {
        // 【核心修复】增加一个保护，确保这个 effect 只会成功执行一次
        if (!initialFetchDone.current) {
            fetchAndStoreStarred();
            initialFetchDone.current = true; // 将 ref 标记为 true
        }
    }, [fetchAndStoreStarred]); // 依赖项保持稳定

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
        refreshStarred: fetchAndStoreStarred,
    };
};