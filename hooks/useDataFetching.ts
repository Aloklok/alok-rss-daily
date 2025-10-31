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

    useEffect(() => {
        const fetchData = async (filter: Filter, slotOverride?: 'morning' | 'afternoon' | 'evening' | null) => {
            if (!filter) return;
            setIsLoading(true);

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
                        const reportsWithState = fetchedReports.map(report => ({
                            ...report,
                            articles: Object.entries(report.articles).reduce((acc, [importance, articles]) => {
                                acc[importance] = articles.map(article => ({
                                    ...article,
                                    tags: states[String(article.id)] || []
                                }));
                                return acc;
                            }, {} as GroupedArticles)
                        }));
                        setReports(reportsWithState);
                    } else {
                        setReports(fetchedReports);
                    }

                    if (fetchedReports.length > 0) {
                        setSelectedReportId(fetchedReports[0].id);
                    } else {
                        setSelectedReportId(null); // Explicitly set to null if no reports
                    }
                } catch (error) {
                    console.error(`Failed to fetch data for date filter`, error);
                    setReports([]);
                    setSelectedReportId(null); // Ensure no report is selected on error
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
                        const articlesWithState = articles.map(article => ({
                            ...article,
                            tags: states[String(article.id)] || []
                        }));
                        setFilteredArticles(articlesWithState);
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
        };

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
    }, [activeFilter, isInitialLoad]);

    const manualFetch = useCallback((filter: Filter, slot?: 'morning' | 'afternoon' | 'evening' | null) => {
        // This function is for manual triggers, like the time slot change buttons.
        // It's kept separate from the automatic useEffect fetching.
        const fetchData = async () => {
            // The implementation is identical to the one inside useEffect
            if (!filter) return;
            setIsLoading(true);
            if (filter.type === 'date') {
                setFilteredArticles([]);
                setReports([]);
                setSelectedReportId(null);
                try {
                    const fetchedReports = await getBriefingReportsByDate(filter.value, slot || undefined);
                    const allArticles = fetchedReports.flatMap(report => Object.values(report.articles).flat());
                    const articleIds = allArticles.map(article => article.id);
                    if (articleIds.length > 0) {
                        const states = await getArticleStates(articleIds);
                        const reportsWithState = fetchedReports.map(report => ({
                            ...report,
                            articles: Object.entries(report.articles).reduce((acc, [importance, articles]) => {
                                acc[importance] = articles.map(article => ({ ...article, tags: states[String(article.id)] || [] }));
                                return acc;
                            }, {} as GroupedArticles)
                        }));
                        setReports(reportsWithState);
                    } else {
                        setReports(fetchedReports);
                    }
                    if (fetchedReports.length > 0) setSelectedReportId(fetchedReports[0].id);
                } catch (error) {
                    console.error(`Failed to fetch data for date filter`, error);
                    setReports([]);
                } finally {
                    setIsLoading(false);
                }
            }
        };
        fetchData();
    }, []);

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
        fetchData: manualFetch,
    };
};