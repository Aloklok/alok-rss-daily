// hooks/useDataFetching.ts

import { useState, useEffect, useCallback } from 'react';
import { BriefingReport, Article, Filter, GroupedArticles } from '../types';
import { getBriefingReportsByDate, getArticlesByLabel, getArticlesDetails, getArticleStates, getTodayInShanghai } from '../services/api';
import { useArticleStore } from '../store/articleStore';

// --- 数据融合辅助函数 (FreshRSS -> Supabase) ---
async function mergeArticlesWithDetails(freshArticles: Article[]): Promise<Article[]> {
    if (!freshArticles || freshArticles.length === 0) return [];
    const articleIds = freshArticles.map(a => a.id);
    const supaDetailsById = await getArticlesDetails(articleIds);
    return freshArticles.map(freshArticle => {
        const supaDetails = supaDetailsById[freshArticle.id];
        return supaDetails ? { ...supaDetails, ...freshArticle } : freshArticle;
    });
}

interface UseDataFetchingProps {
    activeFilter: Filter | null;
    isInitialLoad: boolean;
}

export const useDataFetching = ({ activeFilter, isInitialLoad }: UseDataFetchingProps) => {
    const [reportStructure, setReportStructure] = useState<any>(null);
    const [filteredArticleIds, setFilteredArticleIds] = useState<(string | number)[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [timeSlot, setTimeSlot] = useState<'morning' | 'afternoon' | 'evening' | null>(null);
    const addArticles = useArticleStore((state) => state.addArticles);

    const fetchData = useCallback(async (filter: Filter, slotOverride?: 'morning' | 'afternoon' | 'evening' | null) => {
        if (!filter) return;
        setIsLoading(true);

        if (filter.type === 'date') {
            setFilteredArticleIds([]);
            try {
                const fetchedReports = await getBriefingReportsByDate(filter.value, slotOverride || undefined);
                const supaArticles = fetchedReports.flatMap(report => Object.values(report.articles).flat());

                if (supaArticles.length > 0) {
                    const articleIds = supaArticles.map(a => a.id);
                    // 【核心修复】假设 getArticleStates 返回的是一个包含 categories 和 annotations 的对象
                    // 如果它只返回 tags，我们需要修改 getArticleStates 的后端
                    // 这里我们假设它返回的是完整的 tags 数组（已在后端修复）
                    const tagsById = await getArticleStates(articleIds);

                    const completeArticles = supaArticles.map(supaArticle => ({
                        ...supaArticle,
                        tags: tagsById[supaArticle.id] || [],
                    }));
                    
                    addArticles(completeArticles);
                }
                
                const reportStruct = fetchedReports.map(report => ({
                    id: report.id,
                    title: report.title,
                    articles: Object.fromEntries(
                        Object.entries(report.articles).map(([key, articles]) => [
                            key,
                            articles.map(a => a.id)
                        ])
                    )
                }));
                setReportStructure(reportStruct);
                
            } catch (error) {
                console.error(`Failed to fetch data for date filter`, error);
                setReportStructure(null);
            } finally {
                setIsLoading(false);
            }
        } else if (filter.type === 'category' || filter.type === 'tag') {
            setReportStructure(null);
            try {
                const freshArticles = await getArticlesByLabel(filter);
                const mergedArticles = await mergeArticlesWithDetails(freshArticles);
                
                addArticles(mergedArticles);
                setFilteredArticleIds(mergedArticles.map(a => a.id));
            } catch (error) {
                console.error(`Failed to fetch data for ${filter.type} filter`, error);
                setFilteredArticleIds([]);
            } finally {
                setIsLoading(false);
            }
        } else {
            setIsLoading(false);
        }
    }, [addArticles]);

    useEffect(() => {
        if (isInitialLoad || !activeFilter) return;
        fetchData(activeFilter);
    }, [activeFilter, isInitialLoad, fetchData]);

    return {
        reportStructure,
        filteredArticleIds,
        isLoading,
        timeSlot,
        setTimeSlot,
        fetchData,
    };
};