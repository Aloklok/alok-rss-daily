// hooks/useArticles.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    getBriefingReportsByDate, 
    getArticlesByLabel, 
    getStarredArticles, 
    getArticlesDetails,
    getArticleStates,
    editArticleTag,
    markAllAsRead as apiMarkAllAsRead
} from '../services/api';
import { useArticleStore } from '../store/articleStore';
import { Article } from '../types';

// --- 数据融合辅助函数 ---
async function mergeWithSupabaseDetails(freshArticles: Article[]): Promise<Article[]> {
    if (!freshArticles || freshArticles.length === 0) return [];
    const articleIds = freshArticles.map(a => a.id);
    const supaDetailsById = await getArticlesDetails(articleIds);
    return freshArticles.map(freshArticle => {
        const supaDetails = supaDetailsById[freshArticle.id];
        return supaDetails ? { ...supaDetails, ...freshArticle } : freshArticle;
    });
}

// --- Query Hooks ---

// 1. 获取简报文章
export const useBriefingArticles = (date: string | null, slot: string | null) => {
    const addArticles = useArticleStore(state => state.addArticles);

    return useQuery({
        queryKey: ['briefing', date, slot],
        queryFn: async () => {
            if (!date) return [];
            const fetchedReports = await getBriefingReportsByDate(date, slot as any);
            const supaArticles = fetchedReports.flatMap(report => Object.values(report.articles).flat());
            if (supaArticles.length === 0) return [];

            const articleIds = supaArticles.map(a => a.id);
            const statesById = await getArticleStates(articleIds);

            const completeArticles = supaArticles.map(supaArticle => ({
                ...supaArticle,
                tags: statesById[supaArticle.id] || [],
            }));
            
            addArticles(completeArticles);
            return completeArticles.map(a => a.id);
        },
        enabled: !!date, // 只有当 date 存在时才执行查询
    });
};

// 2. 获取分类/标签文章
export const useFilteredArticles = (filterValue: string | null) => {
    const addArticles = useArticleStore(state => state.addArticles);

    return useQuery({
        queryKey: ['articles', filterValue],
        queryFn: async () => {
            if (!filterValue) return [];
            const freshArticles = await getArticlesByLabel({ value: filterValue } as any);
            const mergedArticles = await mergeWithSupabaseDetails(freshArticles);
            addArticles(mergedArticles);
            return mergedArticles.map(a => a.id);
        },
        enabled: !!filterValue,
    });
};

// 3. 获取收藏文章
export const useStarredArticles = () => {
    const { addArticles, setStarredArticleIds } = useArticleStore.getState();

    return useQuery({
        queryKey: ['starred'],
        queryFn: async () => {
            const freshArticles = await getStarredArticles();
            const mergedArticles = await mergeWithSupabaseDetails(freshArticles);
            addArticles(mergedArticles);
            setStarredArticleIds(mergedArticles.map(a => a.id));
            return mergedArticles.map(a => a.id);
        },
    });
};


// --- Mutation Hooks ---

// 4. 更新文章状态 (标签、收藏、已读)
export const useUpdateArticleState = () => {
    const queryClient = useQueryClient();
    const { updateArticle } = useArticleStore.getState();
    const articlesById = useArticleStore.getState().articlesById;

    return useMutation({
        mutationFn: async ({ articleId, tagsToAdd, tagsToRemove }: { articleId: string | number, tagsToAdd: string[], tagsToRemove: string[] }) => {
            return editArticleTag(articleId, tagsToAdd, tagsToRemove);
        },
        onMutate: async ({ articleId, tagsToAdd, tagsToRemove }) => {
            await queryClient.cancelQueries(); // 取消所有可能冲突的查询
            const articleToUpdate = articlesById[articleId];
            if (!articleToUpdate) return;

            const originalArticle = { ...articleToUpdate };

            const finalTagsSet = new Set(articleToUpdate.tags || []);
            tagsToAdd.forEach(tag => finalTagsSet.add(tag));
            tagsToRemove.forEach(tag => finalTagsSet.delete(tag));
            const updatedArticle = { ...articleToUpdate, tags: Array.from(finalTagsSet) };

            // 乐观更新 Zustand Store
            updateArticle(updatedArticle);

            return { originalArticle }; // 返回快照
        },
        onError: (err, variables, context) => {
            // 如果出错，回滚 Zustand Store
            if (context?.originalArticle) {
                updateArticle(context.originalArticle);
            }
        },
        onSettled: () => {
            // 无论成功失败，都让 'starred' 查询失效，以确保收藏列表的准确性
            queryClient.invalidateQueries(['starred']);
        },
    });
};

// 5. 批量标记已读
export const useMarkAllAsRead = () => {
    const queryClient = useQueryClient();
    const { updateArticle } = useArticleStore.getState();
    const articlesById = useArticleStore.getState().articlesById;

    return useMutation({
        mutationFn: apiMarkAllAsRead,
        onMutate: async (articleIds) => {
            await queryClient.cancelQueries();
            const originalArticles = articleIds.map(id => articlesById[id]).filter(Boolean);
            
            const updatedArticles = originalArticles.map(article => {
                if (article.tags?.includes('user/-/state/com.google/read')) return article;
                return { ...article, tags: [...(article.tags || []), 'user/-/state/com.google/read'] };
            });

            updatedArticles.forEach(updateArticle);

            return { originalArticles };
        },
        onError: (err, variables, context) => {
            context?.originalArticles.forEach(updateArticle);
        },
    });
};