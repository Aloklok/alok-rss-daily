import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Briefing from './components/Briefing';
import ReaderView from './components/ReaderView';
import { BriefingReport, Article, CleanArticleContent, Filter, AvailableFilters } from './types';
import { getAvailableDates, getBriefingReportsByDate, markAllAsRead, getCleanArticleContent, getArticleStates, editArticleState, editArticleTag, getAvailableFilters, getArticlesByCategory, getArticlesByTag, getStarredArticles } from './services/api';
import ArticlePreviewModal from './components/ArticlePreviewModal';

const LoadingSpinner: React.FC = () => (
    <div className="flex items-center justify-center h-full w-full">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
    </div>
);

const App: React.FC = () => {
    const [reports, setReports] = useState<BriefingReport[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [dates, setDates] = useState<string[]>([]);
    const [activeFilter, setActiveFilter] = useState<Filter | null>(null);
    const [availableFilters, setAvailableFilters] = useState<AvailableFilters>({ categories: [], tags: [] });
    const [selectedMonth, setSelectedMonth] = useState<string>('');

    const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
    
    const [isMarkingAsRead, setIsMarkingAsRead] = useState(false);
    
    const [readerContent, setReaderContent] = useState<CleanArticleContent | null>(null);
    const [isReaderLoading, setIsReaderLoading] = useState(false);
    const [isReaderVisible, setIsReaderVisible] = useState(false);

    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const mainContentRef = useRef<HTMLDivElement | null>(null);

    const fetchData = useCallback(async (filter: Filter) => {
        if (!filter) return;
        setIsLoading(true);
        setReports([]);
        setSelectedReportId(null);
        try {
            let fetchedReports: BriefingReport[] = [];
            let articles: (Omit<Article, 'tags'>)[] = [];

            if (filter.type === 'date') {
                fetchedReports = await getBriefingReportsByDate(filter.value);
                articles = fetchedReports.flatMap(report => report.articles);
            } else if (filter.type === 'category') {
                articles = await getArticlesByCategory(filter.value);
            } else if (filter.type === 'tag') {
                articles = await getArticlesByTag(filter.value);
            } else if (filter.type === 'starred') {
                articles = await getStarredArticles();
            }

            if (filter.type !== 'date') {
                const sortedArticles = (articles as Article[]).sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime())
                fetchedReports = articles.length > 0 ? [{ id: 999, title: 'Filtered Results', articles: sortedArticles }] : [];
            }
            
            const articleIds = articles.map(article => article.id);

            if (articleIds.length > 0) {
                const states = await getArticleStates(articleIds);
                const reportsWithState = fetchedReports.map(report => ({
                    ...report,
                    articles: report.articles.map(article => ({
                        ...article,
                        tags: states[article.id] || []
                    }))
                }));
                 setReports(reportsWithState as BriefingReport[]);
            } else {
                setReports(fetchedReports as BriefingReport[]);
            }

            if (fetchedReports.length > 0) {
                setSelectedReportId(fetchedReports[0].id);
            }
        } catch (error) {
            console.error(`Failed to fetch data for filter`, error);
            setReports([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const fetchInitialData = async () => {
            setIsLoading(true);
            try {
                const [availableDates, filters] = await Promise.all([
                    getAvailableDates(),
                    getAvailableFilters()
                ]);

                const sortedDates = availableDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
                setDates(sortedDates);
                setAvailableFilters(filters);
                
                if (sortedDates.length > 0) {
                    const latestDate = sortedDates[0];
                    const initialFilter = { type: 'date' as const, value: latestDate };
                    setActiveFilter(initialFilter);
                    setSelectedMonth(latestDate.substring(0, 7));
                    fetchData(initialFilter);
                } else {
                     setActiveFilter({ type: 'starred', value: 'true'});
                     fetchData({ type: 'starred', value: 'true'});
                }
            } catch (error) {
                console.error("Failed to fetch initial data", error);
                setIsLoading(false);
            }
        };
        fetchInitialData();
    }, [fetchData]);

    const availableMonths = useMemo(() => {
        if (dates.length === 0) return [];
        const monthSet = new Set<string>();
        dates.forEach(date => {
            monthSet.add(date.substring(0, 7));
        });
        return Array.from(monthSet).sort((a, b) => b.localeCompare(a));
    }, [dates]);

    const datesForMonth = useMemo(() => {
        if (!selectedMonth) return [];
        return dates.filter(date => date.startsWith(selectedMonth));
    }, [dates, selectedMonth]);

    const handleFilterChange = (filter: Filter) => {
        setActiveFilter(filter);
        fetchData(filter);
    };

    const handleResetFilter = () => {
        if (dates.length > 0) {
            const latestDate = dates[0];
            const resetFilter = { type: 'date' as const, value: latestDate };
            handleFilterChange(resetFilter);
            setSelectedMonth(latestDate.substring(0, 7));
        }
    };
    
    const handleArticleStateChange = async (articleId: string | number, newTags: string[]) => {
        const originalReports = reports;
        const updatedReports = reports.map(report => ({
            ...report,
            articles: report.articles.map(article => 
                article.id === articleId ? { ...article, tags: newTags } : article
            )
        }));
        setReports(updatedReports);

        try {
            const originalArticle = originalReports.flatMap(r => r.articles).find(a => a.id === articleId);
            const originalTags = originalArticle?.tags || [];
            
            const isNowStarred = newTags.includes('user/-/state/com.google/starred');
            const wasStarred = originalTags.includes('user/-/state/com.google/starred');
            if (isNowStarred !== wasStarred) {
                await editArticleState(articleId, 'star', isNowStarred);
            }

            const isNowRead = newTags.includes('user/-/state/com.google/read');
            const wasRead = originalTags.includes('user/-/state/com.google/read');
            if (isNowRead !== wasRead) {
                await editArticleState(articleId, 'read', isNowRead);
            }

            const originalUserTags = new Set(originalTags.filter(t => !t.startsWith('user/-/state')));
            const newUserTags = new Set(newTags.filter(t => !t.startsWith('user/-/state')));
            const tagsToAdd = [...newUserTags].filter(t => !originalUserTags.has(t));
            const tagsToRemove = [...originalUserTags].filter(t => !newUserTags.has(t));
            if (tagsToAdd.length > 0 || tagsToRemove.length > 0) {
                await editArticleTag(articleId, tagsToAdd, tagsToRemove);
            }

        } catch (error) {
            console.error("Failed to update article state, rolling back.", error);
            setReports(originalReports);
        }
    };

    const handleMarkAllAsRead = async () => {
        setIsMarkingAsRead(true);
        try {
            await markAllAsRead();
        } catch (error) {
            console.error("UI: Failed to mark all as read.", error);
        } finally {
            setIsMarkingAsRead(false);
        }
    };

    const handleScrollToTop = () => {
        if (window.innerWidth < 768) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

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

    const handlePreviewArticle = (url: string) => {
        setPreviewUrl(url);
    };

    return (
        <div className="flex flex-col md:flex-row h-screen font-sans">
            <Sidebar 
                dates={datesForMonth} 
                isLoading={isLoading}
                availableMonths={availableMonths}
                selectedMonth={selectedMonth}
                onMonthChange={setSelectedMonth}
                availableFilters={availableFilters}
                activeFilter={activeFilter}
                onFilterChange={handleFilterChange}
            />
            <div ref={mainContentRef} className="flex-1 overflow-y-auto relative bg-stone-50">
                {isLoading ? (
                    <LoadingSpinner />
                ) : (
                    <Briefing 
                        reports={reports} 
                        activeFilter={activeFilter}
                        selectedReportId={selectedReportId}
                        onReportSelect={setSelectedReportId}
                        onReaderModeRequest={handleOpenReader}
                        onPreviewArticle={handlePreviewArticle}
                        onStateChange={handleArticleStateChange}
                        onResetFilter={handleResetFilter}
                    />
                )}
                
                <div className="fixed bottom-8 right-8 z-20 flex flex-col-reverse items-center gap-y-3">
                     <button
                        onClick={handleScrollToTop}
                        className="p-3 bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-950 transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800"
                        aria-label="Back to top"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                    </button>
                    <button
                        onClick={handleMarkAllAsRead}
                        disabled={isMarkingAsRead}
                        className="p-3 bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-950 transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800 disabled:bg-gray-500 disabled:cursor-wait"
                        aria-label="Mark all as read"
                    >
                        {isMarkingAsRead ? (
                            <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        )}
                    </button>
                </div>

                <ReaderView 
                    isVisible={isReaderVisible}
                    isLoading={isReaderLoading}
                    content={readerContent}
                    onClose={() => setIsReaderVisible(false)}
                />
                <ArticlePreviewModal 
                    url={previewUrl}
                    onClose={() => setPreviewUrl(null)}
                />
            </div>
        </div>
    );
};

export default App;