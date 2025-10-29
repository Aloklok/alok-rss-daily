import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Briefing from './components/Briefing';
import ReaderView from './components/ReaderView';
import { BriefingReport, Article, CleanArticleContent, Filter, AvailableFilters } from './types';
import { getBriefingReportsByDate, markAllAsRead, getCleanArticleContent, getArticleStates, editArticleState, editArticleTag, getAvailableFilters, getArticlesByLabel, getStarredArticles } from './services/api';
import ArticlePreviewModal from './components/ArticlePreviewModal';
import ArticleDetail from './components/ArticleDetail';
import ArticleList from './components/ArticleList'; // Import the new ArticleList component

const LoadingSpinner: React.FC = () => (
    <div className="flex items-center justify-center h-full w-full">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
    </div>
);

const App: React.FC = () => {
    const [reports, setReports] = useState<BriefingReport[]>([]);
    const [filteredArticles, setFilteredArticles] = useState<Article[]>([]); // New state for category/tag articles
    const [isLoading, setIsLoading] = useState(true);
    
    // Removed dates, selectedMonth, availableMonths, datesForMonth states and related useMemos
    const [activeFilter, setActiveFilter] = useState<Filter | null>(null);
    const [availableFilters, setAvailableFilters] = useState<AvailableFilters>({ categories: [], tags: [] });

    const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
    
    const [isMarkingAsRead, setIsMarkingAsRead] = useState(false);
    
    const [readerContent, setReaderContent] = useState<CleanArticleContent | null>(null);
    const [isReaderLoading, setIsReaderLoading] = useState(false);
    const [isReaderVisible, setIsReaderVisible] = useState(false);

    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [sidebarArticle, setSidebarArticle] = useState<Article | null>(null);

    const mainContentRef = useRef<HTMLDivElement | null>(null);

    const fetchData = useCallback(async (filter: Filter) => {
        if (!filter) return;
        setIsLoading(true);
        setSidebarArticle(null); // Clear any inline article view

        if (filter.type === 'date') {
            setFilteredArticles([]); // Clear filtered articles if a date filter is selected
            setReports([]); // Clear reports to ensure Briefing re-fetches if needed
            setSelectedReportId(null);
            try {
                // getBriefingReportsByDate now fetches all articles, no date parameter needed
                const fetchedReports = await getBriefingReportsByDate();
                const articles = fetchedReports.flatMap(report => report.articles);
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
                console.error(`Failed to fetch data for date filter`, error);
                setReports([]);
            } finally {
                setIsLoading(false);
            }
        } else if (filter.type === 'category' || filter.type === 'tag') {
            setReports([]); // Clear reports if category/tag filter is selected
            setSelectedReportId(null);
            try {
                const articles = await getArticlesByLabel(filter);
                const articleIds = articles.map(article => article.id);
                if (articleIds.length > 0) {
                    const states = await getArticleStates(articleIds);
                    const articlesWithState = articles.map(article => ({
                        ...article,
                        tags: states[article.id] || []
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
            // Starred articles are handled in Sidebar, no main content change needed.
            setReports([]);
            setFilteredArticles([]);
            setSelectedReportId(null);
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const fetchInitialData = async () => {
            setIsLoading(true);
            try {
                const filters = await getAvailableFilters();
                setAvailableFilters(filters);
                
                // Set initial filter to 'date' to show all articles as "Today's Briefing"
                const initialFilter = { type: 'date' as const, value: 'today' };
                setActiveFilter(initialFilter);
                fetchData(initialFilter);
            } catch (error) {
                console.error("Failed to fetch initial data", error);
                setIsLoading(false);
            }
        };
        fetchInitialData();
    }, [fetchData]);

    const refreshSidebar = async () => {
        try {
            const filtersNew = await getAvailableFilters();
            setAvailableFilters(filtersNew);
            // Re-fetch current active filter data if it's not starred
            if (activeFilter && activeFilter.type !== 'starred') {
                fetchData(activeFilter);
            }
        } catch (error) {
            console.error('Failed to refresh sidebar data', error);
        }
    };

    // Removed availableMonths and datesForMonth useMemos

    const handleFilterChange = (filter: Filter) => {
        setActiveFilter(filter);
        fetchData(filter);
    };

    const handleResetFilter = () => {
        // Reset to the default "Today's Briefing" view
        const resetFilter = { type: 'date' as const, value: 'today' };
        handleFilterChange(resetFilter);
    };
    
    const handleArticleStateChange = async (articleId: string | number, newTags: string[]) => {
        // This function needs to handle state updates for both reports and filteredArticles
        // depending on which view is active or if the article exists in both.
        // For simplicity, we'll update both if the article is found.

        const updateArticleTags = (articles: Article[], id: string | number, tags: string[]) => {
            return articles.map(article => 
                article.id === id ? { ...article, tags: tags } : article
            );
        };

        const originalReports = reports;
        const originalFilteredArticles = filteredArticles;

        setReports(prevReports => prevReports.map(report => ({
            ...report,
            articles: updateArticleTags(report.articles, articleId, newTags)
        })));
        setFilteredArticles(prevArticles => updateArticleTags(prevArticles, articleId, newTags));

        try {
            // Find the original article from either source to compare tags
            const originalArticle = originalReports.flatMap(r => r.articles).find(a => a.id === articleId) ||
                                    originalFilteredArticles.find(a => a.id === articleId);

            const originalTags: string[] = originalArticle?.tags || [];
            
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
            setFilteredArticles(originalFilteredArticles);
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

    const handleShowArticleInMain = useCallback((article: Article) => {
        // Clear any ReaderView modal usage and show article inline
        setIsReaderVisible(false);
        setSidebarArticle(article);
        // keep readerContent empty - ArticleDetail will fetch on its own
    }, []);

    const handlePreviewArticle = (url: string) => {
        setPreviewUrl(url);
    };

    return (
        <div className="flex flex-col md:flex-row h-screen font-sans">
            <Sidebar 
                // Removed date-related props
                isLoading={isLoading}
                availableFilters={availableFilters}
                activeFilter={activeFilter}
                onFilterChange={handleFilterChange}
                onOpenArticle={handleShowArticleInMain}
                onRefresh={refreshSidebar}
            />
            <div ref={mainContentRef} className="flex-1 overflow-y-auto relative bg-stone-50">
                {isLoading ? (
                    <LoadingSpinner />
                ) : sidebarArticle ? (
                    <ArticleDetail article={sidebarArticle} onClose={() => setSidebarArticle(null)} />
                ) : activeFilter?.type === 'date' ? (
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
                ) : (activeFilter?.type === 'category' || activeFilter?.type === 'tag') ? (
                    <ArticleList
                        articles={filteredArticles}
                        onOpenArticle={handleOpenReader}
                        isLoading={isLoading}
                    />
                ) : (
                    <div className="p-8 text-center text-gray-500">
                        <p>请选择一个分类或标签来查看文章列表。</p>
                    </div>
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