import { useState, useCallback, useEffect } from 'react';
import { Article, CleanArticleContent } from '../types';
import { getCleanArticleContent } from '../services/api';
import { useArticleStore } from '../store/articleStore'; // 【新增】导入 Zustand store

export const useReader = () => {
    const [readerContent, setReaderContent] = useState<CleanArticleContent | null>(null);
    const [isReaderLoading, setIsReaderLoading] = useState(false);
    const [isReaderVisible, setIsReaderVisible] = useState(false);
    const [sidebarArticle, setSidebarArticle] = useState<Article | null>(null);
    const [articleForReader, setArticleForReader] = useState<Article | null>(null);

    const articlesById = useArticleStore((state) => state.articlesById); // 【新增】从 store 获取全局文章

    // 【核心新增】当全局文章数据变化时，同步更新 articleForReader
    useEffect(() => {
        if (articleForReader) {
            const latestArticleVersion = articlesById[articleForReader.id];
            if (latestArticleVersion) {
                // 只在 article 对象真正发生变化时（例如 tags 数组被修改）才更新
                // 避免不必要的重渲染
                if (JSON.stringify(latestArticleVersion.tags) !== JSON.stringify(articleForReader.tags)) {
                    setArticleForReader(latestArticleVersion);
                }
            }
        }
    }, [articlesById, articleForReader]);

    const handleOpenReader = useCallback(async (article: Article) => {
        setIsReaderVisible(true);
        setIsReaderLoading(true);
        setArticleForReader(article);
        setReaderContent(null);
        try {
            const content = await getCleanArticleContent(article);
            setReaderContent(content);
        } catch (error) {
            console.error("Failed to fetch clean article content", error);
        } finally {
            setIsReaderLoading(false);
        }
    }, []);

    const handleShowArticleInMain = useCallback((article: Article) => {
        setIsReaderVisible(false);
        setSidebarArticle(article);
        setArticleForReader(null);
    }, []);

    const handleCloseArticleDetail = useCallback(() => {
        setSidebarArticle(null);
    }, []);

    return {
        readerContent,
        isReaderLoading,
        isReaderVisible,
        sidebarArticle,
        articleForReader,
        handleOpenReader,
        handleShowArticleInMain,
        handleCloseReader: () => {
            setIsReaderVisible(false);
            setArticleForReader(null);
        },
        handleCloseArticleDetail,
    };
};
