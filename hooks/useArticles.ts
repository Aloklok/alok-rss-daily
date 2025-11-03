// hooks/useArticles.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    fetchBriefingArticles, 
    fetchFilteredArticles, 
    fetchStarredArticles 
} from '../services/articleLoader'; // 1. 【核心修改】从新的加载器导入
import { editArticleTag, editArticleState, markAllAsRead as apiMarkAllAsRead } from '../services/api';
import { useArticleStore } from '../store/articleStore';

// --- Query Hooks (现在变得非常简洁) ---

export const useBriefingArticles = (date: string | null, slot: string | null) => {
    const addArticles = useArticleStore(state => state.addArticles);
    return useQuery({
        queryKey: ['briefing', date, slot],
        queryFn: async () => {
            if (!date) return [];
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
    const addArticles = useArticleStore(state => state.addArticles);
    const setStarredArticleIds = useArticleStore(state => state.setStarredArticleIds);
    return useQuery({
        queryKey: ['starred'],
        queryFn: async () => {
            const mergedArticles = await fetchStarredArticles();
            addArticles(mergedArticles);
            setStarredArticleIds(mergedArticles.map(a => a.id));
            return mergedArticles.map(a => a.id);
        },
    });
};

// --- Mutation Hooks ---

// hooks/useArticles.ts

// ... (其他 Hooks 保持不变)

// 4. 更新文章状态 (标签、收藏、已读) - 非乐观更新版本
export const useUpdateArticleState = () => {
    const queryClient = useQueryClient();
    const updateArticle = useArticleStore((state) => state.updateArticle);
    const articlesById = useArticleStore((state) => state.articlesById);

    return useMutation({
        mutationFn: async ({ articleId, tagsToAdd, tagsToRemove }: { articleId: string | number, tagsToAdd: string[], tagsToRemove: string[] }) => {
            // 1. 【核心修改】API 调用现在是 mutationFn 的一部分
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

            // 2. 【核心修改】在 API 成功后，计算并返回最新的文章对象
            const articleToUpdate = articlesById[articleId];
            if (!articleToUpdate) throw new Error("Article not found in store");

            const finalTagsSet = new Set(articleToUpdate.tags || []);
            tagsToAdd.forEach(tag => finalTagsSet.add(tag));
            tagsToRemove.forEach(tag => finalTagsSet.delete(tag));
            return { ...articleToUpdate, tags: Array.from(finalTagsSet) };
        },
        
        // 3. 【核心修改】移除 onMutate，因为我们不再进行乐观更新
        
        // 4. 【核心修改】在 onSuccess 中更新 Store
        onSuccess: (updatedArticle) => {
            // updatedArticle 是从 mutationFn 返回的最新文章对象
            updateArticle(updatedArticle);
        },

        onError: (err, variables, context) => {
            // onError 现在只负责报告错误，不再需要回滚
            console.error("Failed to update article state:", err);
        },
        
        onSettled: () => {
            // onSettled 仍然可以用来让其他查询失效
            queryClient.invalidateQueries({ queryKey: ['starred'] });
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
        onMutate: async (articleIds) => {
            await queryClient.cancelQueries();
            const originalArticles = articleIds.map(id => articlesById[id]).filter(Boolean);
            if(originalArticles.length === 0) return { originalArticles: [] };
            
            const updatedArticles = originalArticles.map(article => {
                if (article.tags?.includes('user/-/state/com.google/read')) return article;
                return { ...article, tags: [...(article.tags || []), 'user/-/state/com.google/read'] };
            });

            updatedArticles.forEach(updateArticle);
            return { originalArticles };
        },
        onError: (err, variables, context) => {
            context?.originalArticles?.forEach(updateArticle);
        },
    });
};