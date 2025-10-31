import { useState, useCallback } from 'react';
import { Article, CleanArticleContent } from '../types';
import { getCleanArticleContent } from '../services/api';

export const useReader = () => {
    const [readerContent, setReaderContent] = useState<CleanArticleContent | null>(null);
    const [isReaderLoading, setIsReaderLoading] = useState(false);
    const [isReaderVisible, setIsReaderVisible] = useState(false);
    const [sidebarArticle, setSidebarArticle] = useState<Article | null>(null);

    const handleOpenReader = useCallback(async (article: Article) => {
        setIsReaderVisible(true);
        setIsReaderLoading(true);
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
    }, []);

    const handleCloseArticleDetail = useCallback(() => {
        setSidebarArticle(null);
    }, []);

    return {
        readerContent,
        isReaderLoading,
        isReaderVisible,
        sidebarArticle,
        handleOpenReader,
        handleShowArticleInMain,
        handleCloseReader: () => setIsReaderVisible(false),
        handleCloseArticleDetail,
    };
};
