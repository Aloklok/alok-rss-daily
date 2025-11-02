import { useState, useEffect, useCallback } from 'react';
import { BriefingReport, Article, Filter, GroupedArticles } from '../types';
import { getBriefingReportsByDate, getArticlesByLabel, getArticleStates, getTodayInShanghai } from '../services/api';

interface UseDataFetchingProps {
    activeFilter: Filter | null;
    isInitialLoad: boolean;
}

export const useDataFetching = ({ activeFilter, isInitialLoad }: UseDataFetchingProps) => {
    const [reports, setReports] = useState<BriefingReport[]>([]);
    const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
    const [timeSlot, setTimeSlot] = useState<'morning' | 'afternoon' | 'evening' | null>(null);

    const fetchData = useCallback(async (filter: Filter, slotOverride?: 'morning' | 'afternoon' | 'evening' | null) => {
        if (!filter) return;
        setIsLoading(true);

        // All sessionStorage logic is removed. The service worker will handle caching.

        if (filter.type === 'date') {
            setFilteredArticles([]);
            setReports([]);
            setSelectedReportId(null);
            try {
                const fetchedReports = await getBriefingReportsByDate(filter.value, slotOverride || undefined);
                const allArticles = fetchedReports.flatMap(report => Object.values(report.articles).flat());
                const articleIds = allArticles.map(article => article.id);

                if (articleIds.length > 0) {
                    const states = await getArticleStates(articleIds);
                    const reportsWithStates = fetchedReports.map(report => ({
                        ...report,
                        articles: Object.entries(report.articles).reduce((acc, [importance, articles]) => {
                            acc[importance] = articles.map(article => ({
                                ...article,
                                tags: states[String(article.id)] || []
                            }));
                            return acc;
                        }, {} as GroupedArticles)
                    }));
                    setReports(reportsWithStates);
                    if (isInitialLoad && reportsWithStates.length > 0) {
                        setSelectedReportId(reportsWithStates[0].id);
                    }
                } else {
                    setReports(fetchedReports);
                    if (isInitialLoad && fetchedReports.length > 0) {
                        setSelectedReportId(fetchedReports[0].id);
                    }
                }
            } catch (error) {
                console.error(`Failed to fetch data for date filter`, error);
                setReports([]);
                setSelectedReportId(null);
            } finally {
                setIsLoading(false);
            }
        } else if (filter.type === 'category' || filter.type === 'tag') {
            setReports([]);
            setSelectedReportId(null);
            try {
                const articles = await getArticlesByLabel(filter);
                const articleIds = articles.map(article => article.id);

                if (articleIds.length > 0) {
                    const states = await getArticleStates(articleIds);
                    const articlesWithStates = articles.map(article => ({
                        ...article,
                        tags: states[String(article.id)] || []
                    }));
                    setFilteredArticles(articlesWithStates);
                } else {
                    setFilteredArticles([]);
                }
            } catch (error) {
                console.error(`Failed to fetch data for ${filter.type} filter`, error);
                setFilteredArticles([]);
            } finally {
                setIsLoading(false);
            }
        } else if (filter.type === 'starred') {
            setReports([]);
            setFilteredArticles([]);
            setSelectedReportId(null);
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isInitialLoad || !activeFilter) return;
    
        const fetchDataForDate = (isToday: boolean) => {
            if (isToday) {
                if (timeSlot) {
                    fetchData(activeFilter, timeSlot);
                } else {
                    const shanghaiHour = new Intl.DateTimeFormat('en-US', { hour: '2-digit', hour12: false, timeZone: 'Asia/Shanghai' })
                        .formatToParts(new Date())
                        .find(p => p.type === 'hour')?.value;
                    const hourNum = shanghaiHour ? parseInt(shanghaiHour, 10) : new Date().getHours();
                    let autoSlot: 'morning' | 'afternoon' | 'evening' | null = null;
                    if (hourNum >= 0 && hourNum < 12) autoSlot = 'morning';
                    else if (hourNum >= 12 && hourNum < 19) autoSlot = 'afternoon';
                    else autoSlot = 'evening';
                    setTimeSlot(autoSlot);
                    fetchData(activeFilter, autoSlot);
                }
            } else {
                setTimeSlot(null);
                fetchData(activeFilter, null);
            }
        };

        if (activeFilter.type === 'date') {
            const today = getTodayInShanghai();
            fetchDataForDate(today ? activeFilter.value === today : false);
        } else {
            fetchData(activeFilter);
        }
    }, [activeFilter, isInitialLoad, fetchData]);

    return {
        reports,
        setReports,
        filteredArticles,
        setFilteredArticles,
        isLoading,
        selectedReportId,
        setSelectedReportId,
        timeSlot,
        setTimeSlot,
        fetchData,
    };
};