// hooks/useArticles.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    fetchBriefingArticles, 
    fetchFilteredArticles, 
    fetchStarredArticleHeaders 
} from '../services/articleLoader'; // 1. 【核心修改】从新的加载器导入
import { getRawStarredArticles,editArticleTag, editArticleState, markAllAsRead as apiMarkAllAsRead } from '../services/api';
import { useArticleStore } from '../store/articleStore';

// --- Query Hooks (现在变得非常简洁) ---

export const useBriefingArticles = (date: string | null, slot: string | null) => {
    const addArticles = useArticleStore(state => state.addArticles);
    return useQuery({
        // 【核心修复 #2】
        // 当 slot 为 null 时，我们给它一个明确的字符串 'all'。
        // 这可以确保 react-query 将 ['briefing', date, null] 和 ['briefing', date, 'all'] 视为两个不同的缓存条目。
        queryKey: ['briefing', date, slot || 'all'],
        queryFn: async () => {
            if (!date) return [];
            // queryFn 接收的仍然是原始的 slot (可以是 null)
            const completeArticles = await fetchBriefingArticles(date, slot);
            addArticles(completeArticles);
            return completeArticles.map(a => a.id);
        },
        enabled: !!date,
    });
};

export const useFilteredArticles = (filterValue: string | null) => {
    const addArticles = useArticleStore(state => state.addArticles);
    return useQuery({
        queryKey: ['articles', filterValue],
        queryFn: async () => {
            if (!filterValue) return [];
            const mergedArticles = await fetchFilteredArticles(filterValue);
            addArticles(mergedArticles);
            return mergedArticles.map(a => a.id);
        },
        enabled: !!filterValue,
    });
};

export const useStarredArticles = () => {
    const setStarredArticleIds = useArticleStore(state => state.setStarredArticleIds);
    return useQuery({
        queryKey: ['starredHeaders'],
        queryFn: async () => {
             // 【改】直接调用最底层的 API 函数，获取 FreshRSS 的原始数据
            const freshArticles = await getRawStarredArticles();
            
            // 我们只更新 starredArticleIds 列表
            setStarredArticleIds(freshArticles.map(a => a.id));
            
            // 返回头部信息给 useSidebar Hook
            return freshArticles.map(a => ({ id: a.id, title: a.title, link: a.link, sourceName: a.sourceName, published: a.published, tags: a.tags }));
        },
    });
};

// --- Mutation Hooks ---

// 4. 更新文章状态 (标签、收藏、已读) - 非乐观更新版本
export const useUpdateArticleState = () => {
    const queryClient = useQueryClient();
    const updateArticle = useArticleStore((state) => state.updateArticle);
    const articlesById = useArticleStore((state) => state.articlesById);

    return useMutation({
        mutationFn: async ({ articleId, tagsToAdd, tagsToRemove }: { articleId: string | number, tagsToAdd: string[], tagsToRemove: string[] }) => {
            // 【查】这段逻辑现在可以完美处理收藏和已读的切换
            const stateTagsToAdd = tagsToAdd.filter(t => t.startsWith('user/-/state'));
            const stateTagsToRemove = tagsToRemove.filter(t => t.startsWith('user/-/state'));
            for (const tag of stateTagsToAdd) {
                if (tag.includes('starred')) await editArticleState(articleId, 'star', true);
                if (tag.includes('read')) await editArticleState(articleId, 'read', true);
            }
            for (const tag of stateTagsToRemove) {
                if (tag.includes('starred')) await editArticleState(articleId, 'star', false);
                if (tag.includes('read')) await editArticleState(articleId, 'read', false);
            }
            
            const userTagsToAdd = tagsToAdd.filter(t => !t.startsWith('user/-/state'));
            const userTagsToRemove = tagsToRemove.filter(t => !t.startsWith('user/-/state'));
            if (userTagsToAdd.length > 0 || userTagsToRemove.length > 0) {
                await editArticleTag(articleId, userTagsToAdd, userTagsToRemove);
            }

            // API 成功后，计算并返回最新的文章对象
            const articleToUpdate = articlesById[articleId];
            if (!articleToUpdate) throw new Error("Article not found in store");

            const finalTagsSet = new Set(articleToUpdate.tags || []);
            tagsToAdd.forEach(tag => finalTagsSet.add(tag));
            tagsToRemove.forEach(tag => finalTagsSet.delete(tag));
            return { ...articleToUpdate, tags: Array.from(finalTagsSet) };
        },
        onSuccess: (updatedArticle) => {
            updateArticle(updatedArticle);
        },
        onError: (err) => {
            console.error("Failed to update article state:", err);
        },
        onSettled: () => {
            // 告诉 react-query，所有与“收藏”相关的查询数据都可能已经过时了。
            // 下一次 useStarredArticles Hook 渲染时，它会自动重新获取最新的头部信息。
            queryClient.invalidateQueries({ queryKey: ['starredHeaders'] });
        },
    });
};

// 5. 批量标记已读
export const useMarkAllAsRead = () => {
    const queryClient = useQueryClient();
    const updateArticle = useArticleStore((state) => state.updateArticle);
    const articlesById = useArticleStore((state) => state.articlesById);

    return useMutation({
        mutationFn: apiMarkAllAsRead,
        onSuccess: (markedIds) => {
            // markedIds 是从 apiMarkAllAsRead 成功返回的 ID 列表
            if (!markedIds || markedIds.length === 0) return;

            const READ_TAG = 'user/-/state/com.google/read';
            markedIds.forEach(id => {
                const articleToUpdate = articlesById[id];
                // 确保文章存在且尚未被标记为已读
                if (articleToUpdate && !articleToUpdate.tags?.includes(READ_TAG)) {
                    updateArticle({
                        ...articleToUpdate,
                        tags: [...(articleToUpdate.tags || []), READ_TAG],
                    });
                }
            });
        },
        onError: (err, variables, context) => {
            console.error("Failed to mark as read:", err);
        },
    });
};