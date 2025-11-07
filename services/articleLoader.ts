// services/articleLoader.ts

import { 
    getBriefingReportsByDate, 
    getRawStarredArticles, // 【增】导入新的 API 函数
    getArticlesByLabel, 
    getStarredArticles, 
    getArticlesDetails,
    getArticleStates
} from './api';
import { Article } from '../types';

// --- 数据融合辅助函数 ---

// 负责为 “FreshRSS文章” 补充 “Supabase详情”
async function mergeWithSupabaseDetails(freshArticles: Article[]): Promise<Article[]> {
    if (!freshArticles || freshArticles.length === 0) return [];
    const articleIds = freshArticles.map(a => a.id);
    const supaDetailsById = await getArticlesDetails(articleIds);
    return freshArticles.map(freshArticle => {
        const supaDetails = supaDetailsById[freshArticle.id];
        // 合并时，以 FreshRSS 的数据为基础，用 Supabase 的数据覆盖默认值
        return supaDetails ? { ...supaDetails, ...freshArticle } : freshArticle;
    });
}

// --- 导出的“数据加载器”函数 ---

// 1. 加载简报文章（已融合）
export async function fetchBriefingArticles(date: string, slot: string | null): Promise<Article[]> {
    const fetchedReports = await getBriefingReportsByDate(date, slot as any);
    const supaArticles = fetchedReports.flatMap(report => Object.values(report.articles).flat());
    if (supaArticles.length === 0) return [];

    const articleIds = supaArticles.map(a => a.id);
    const statesById = await getArticleStates(articleIds);

    // 为 “Supabase文章” 补充 “FreshRSS状态” 并进行数据转换
    return supaArticles.map(supaArticle => ({
        ...supaArticle,
        briefingSection: supaArticle.verdict?.importance || '常规更新',
        tags: statesById[supaArticle.id] || [],
    }));
}

// 2. 加载分类/标签文章（已融合）
export async function fetchFilteredArticles(filterValue: string): Promise<Article[]> {
    const freshArticles = await getArticlesByLabel({ value: filterValue } as any);
    return mergeWithSupabaseDetails(freshArticles);
}

// 3. 加载收藏文章（已融合）
export async function fetchStarredArticles(): Promise<Article[]> {
    const freshArticles = await getStarredArticles();
    return mergeWithSupabaseDetails(freshArticles);
}


// 【增】4. 加载收藏文章的“头部信息”（仅 ID 和标题，供侧边栏初始化使用）
export async function fetchStarredArticleHeaders(): Promise<{ id: string | number; title: string }[]> {
    const freshArticles = await getRawStarredArticles();
    // 只返回侧边栏需要的最少信息，不进行任何 Supabase 合并
    return freshArticles.map(article => ({
        id: article.id,
        title: article.title,
    }));
}