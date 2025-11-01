import { useState, useEffect, useCallback } from 'react';
import { BriefingReport, Article, Filter, GroupedArticles } from '../types';
import { getBriefingReportsByDate, getArticlesByLabel, getArticleStates, getTodayInShanghai } from '../services/api';

interface UseDataFetchingProps {
    activeFilter: Filter | null;
    isInitialLoad: boolean;
}

export const getCacheKey = (filter: Filter, timeSlot: 'morning' | 'afternoon' | 'evening' | null) => {
    if (!filter) return null;
    let key = `articleCache-${filter.type}-${filter.value}`;
    if (filter.type === 'date' && timeSlot) {
        key += `-${timeSlot}`;
    }
    return key;
};

export const useDataFetching = ({ activeFilter, isInitialLoad }: UseDataFetchingProps) => {
    const [reports, setReports] = useState<BriefingReport[]>([]);
    const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
    const [timeSlot, setTimeSlot] = useState<'morning' | 'afternoon' | 'evening' | null>(null);

    const fetchData = useCallback(async (filter: Filter, slotOverride?: 'morning' | 'afternoon' | 'evening' | null, forceRefresh: boolean = false) => {
        if (!filter) return;
        setIsLoading(true);

        const cacheKey = getCacheKey(filter, slotOverride || timeSlot);
        if (!forceRefresh && cacheKey) {
            try {
                const cachedData = sessionStorage.getItem(cacheKey);
                if (cachedData) {
                    const parsedData = JSON.parse(cachedData);
                    if (filter.type === 'date') {
                        setReports(parsedData.reports);
                        setSelectedReportId(parsedData.selectedReportId);
                    } else if (filter.type === 'category' || filter.type === 'tag') {
                        setFilteredArticles(parsedData.articles);
                    }
                    setIsLoading(false);
                    console.log(`useDataFetching: Loaded data from cache for ${cacheKey}`);
                    return;
                }
            } catch (error) {
                console.error(`Failed to load data from cache for ${cacheKey}`, error);
                sessionStorage.removeItem(cacheKey);
            }
        }

        if (filter.type === 'date') {
            setFilteredArticles([]);
            setReports([]);
            setSelectedReportId(null);
            try {
                const fetchedReports = await getBriefingReportsByDate(filter.value, slotOverride || undefined);
                const allArticles = fetchedReports.flatMap(report => Object.values(report.articles).flat());
                const articleIds = allArticles.map(article => article.id);

                let reportsToCache = fetchedReports;
                let selectedReportIdToCache: number | null = null;

                if (articleIds.length > 0) {
                    const states = await getArticleStates(articleIds);
                    reportsToCache = fetchedReports.map(report => ({
                        ...report,
                        articles: Object.entries(report.articles).reduce((acc, [importance, articles]) => {
                            acc[importance] = articles.map(article => ({
                                ...article,
                                tags: states[String(article.id)] || []
                            }));
                            return acc;
                        }, {} as GroupedArticles)
                    }));
                    setReports(reportsToCache);
                } else {
                    setReports(fetchedReports);
                }

                if (reportsToCache.length > 0) {
                    selectedReportIdToCache = reportsToCache[0].id;
                    setSelectedReportId(selectedReportIdToCache);
                } else {
                    setSelectedReportId(null);
                }

                if (cacheKey) {
                    sessionStorage.setItem(cacheKey, JSON.stringify({ reports: reportsToCache, selectedReportId: selectedReportIdToCache }));
                    console.log(`useDataFetching: Cached data for ${cacheKey}`);
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

                let articlesToCache = articles;

                if (articleIds.length > 0) {
                    const states = await getArticleStates(articleIds);
                    articlesToCache = articles.map(article => ({
                        ...article,
                        tags: states[String(article.id)] || []
                    }));
                    setFilteredArticles(articlesToCache);
                } else {
                    setFilteredArticles([]);
                }

                if (cacheKey) {
                    sessionStorage.setItem(cacheKey, JSON.stringify({ articles: articlesToCache }));
                    console.log(`useDataFetching: Cached data for ${cacheKey}`);
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
    }, [timeSlot]); // Added timeSlot to dependencies

    useEffect(() => {
        if (!isInitialLoad && activeFilter) {
            if (activeFilter.type === 'date') {
                const today = getTodayInShanghai();
                if (today && activeFilter.value === today) {
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
                } else {
                    setTimeSlot(null);
                    fetchData(activeFilter, null);
                }
            } else {
                setTimeSlot(null);
                fetchData(activeFilter);
            }
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