import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Briefing from './components/Briefing';
import ReaderView from './components/ReaderView';
import { BriefingReport, Article, CleanArticleContent, Filter, AvailableFilters, Tag } from './types';
import { getAvailableDates, getBriefingReportsByDate, markAllAsRead, getCleanArticleContent, getArticleStates, editArticleState, editArticleTag, getAvailableFilters, getArticlesByLabel, getStarredArticles, getTodayInShanghai } from './services/api';
// import ArticlePreviewModal from './components/ArticlePreviewModal';
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
    
    const [dates, setDates] = useState<string[]>([]); // Re-introduced
    const [activeFilter, setActiveFilter] = useState<Filter | null>(null);
    const [availableFilters, setAvailableFilters] = useState<AvailableFilters>({ categories: [], tags: [] });
    const [availableTags, setAvailableTags] = useState<Tag[]>([]); // For TagPopover
    const [selectedMonth, setSelectedMonth] = useState<string>(''); // Re-introduced

    const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
    const [timeSlot, setTimeSlot] = useState<'morning' | 'afternoon' | 'evening' | null>(null);
    
    const [isMarkingAsRead, setIsMarkingAsRead] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false); // 添加用于更新目录按钮的刷新状态
    
    const [readerContent, setReaderContent] = useState<CleanArticleContent | null>(null);
    const [isReaderLoading, setIsReaderLoading] = useState(false);
    const [isReaderVisible, setIsReaderVisible] = useState(false);

    // const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [sidebarArticle, setSidebarArticle] = useState<Article | null>(null);

    const mainContentRef = useRef<HTMLDivElement | null>(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
    const [isMdUp, setIsMdUp] = useState<boolean>(false);

    // 根据设备宽度设置侧栏默认折叠状态：移动端默认折叠，桌面端默认展开
    useEffect(() => {
        try {
            const isMobile = typeof window !== 'undefined' && window.innerWidth < 768; // md 断点
            setIsSidebarCollapsed(isMobile);
        } catch {}
    }, []);

    // 跟踪 md 及以上视口，用于将按钮精确定位在侧栏外的右上角
    useEffect(() => {
        const updateViewport = () => {
            try {
                const mdUp = typeof window !== 'undefined' && window.innerWidth >= 768;
                setIsMdUp(mdUp);
            } catch {}
        };
        updateViewport();
        window.addEventListener('resize', updateViewport);
        return () => window.removeEventListener('resize', updateViewport);
    }, []);

    const fetchData = useCallback(async (filter: Filter, slotOverride?: 'morning' | 'afternoon' | 'evening' | null) => {
        if (!filter) return;
        setIsLoading(true);
        setSidebarArticle(null); // Clear any inline article view

        if (filter.type === 'date') {
            setFilteredArticles([]); // Clear filtered articles if a date filter is selected
            setReports([]); // Clear reports to ensure Briefing re-fetches if needed
            setSelectedReportId(null);
            try {
                // Fetch with optional time slot override for immediate state updates
                const fetchedReports = await getBriefingReportsByDate(filter.value, slotOverride || undefined);
                
                // New logic to handle GroupedArticles
                const allArticles = fetchedReports.flatMap(report => Object.values(report.articles).flat());
                const articleIds = allArticles.map(article => article.id);

                if (articleIds.length > 0) {
                    const states = await getArticleStates(articleIds);
                    const reportsWithState = fetchedReports.map(report => ({
                        ...report,
                        articles: Object.entries(report.articles).reduce((acc, [importance, articles]) => {
                            acc[importance] = articles.map(article => ({
                                ...article,
                                tags: states[article.id] || []
                            }));
                            return acc;
                        }, {} as typeof report.articles)
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
            }
            finally {
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
            }
            finally {
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
                const [availableDates, filters] = await Promise.all([
                    getAvailableDates(), // Re-introduced
                    getAvailableFilters()
                ]);

                const sortedDates = availableDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
                setDates(sortedDates);
                setAvailableFilters(filters);
                
                // Transform tags for TagPopover
                const transformedTags = filters.tags.map(tag => ({
                    id: `user/1000/label/${tag}`,
                    label: tag
                }));
                setAvailableTags(transformedTags);
                
                if (sortedDates.length > 0) {
                    const latestDate = sortedDates[0];
                    const initialFilter = { type: 'date' as const, value: latestDate };
                    setActiveFilter(initialFilter);
                    setSelectedMonth(latestDate.substring(0, 7)); // Correctly extract YYYY-MM
                    // Initial fetch for date filter with auto slot if today
                    const today = getTodayInShanghai();
                    if (today && latestDate === today) {
                        const shanghaiHour = new Intl.DateTimeFormat('en-US', { hour: '2-digit', hour12: false, timeZone: 'Asia/Shanghai' })
                            .formatToParts(new Date())
                            .find(p => p.type === 'hour')?.value;
                        const hourNum = shanghaiHour ? parseInt(shanghaiHour, 10) : new Date().getHours();
                        let autoSlot: 'morning' | 'afternoon' | 'evening' | null = null;
                        if (hourNum >= 0 && hourNum <= 11) autoSlot = 'morning';
                        else if (hourNum >= 12 && hourNum <= 17) autoSlot = 'afternoon';
                        else autoSlot = 'evening';
                        setTimeSlot(autoSlot);
                        fetchData(initialFilter, autoSlot);
                    } else {
                        setTimeSlot(null);
                        fetchData(initialFilter, null);
                    }
                } else {
                    // If no dates, set activeFilter to null, main content will show prompt
                    setActiveFilter(null);
                    setIsLoading(false);
                }
            } catch (error) {
                console.error("Failed to fetch initial data", error);
                setIsLoading(false);
            }
        };
        fetchInitialData();
    }, [fetchData]);

    const refreshSidebar = async () => {
        try {
            const [availableDatesNew, filtersNew] = await Promise.all([
                getAvailableDates(), // Re-introduced
                getAvailableFilters()
            ]);
            const sortedDates = availableDatesNew.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
            setDates(sortedDates);
            setAvailableFilters(filtersNew);
            // Re-fetch current active filter data if it's not starred
            if (activeFilter && activeFilter.type !== 'starred') {
                fetchData(activeFilter, timeSlot);
            }
        } catch (error) {
            console.error('Failed to refresh sidebar data', error);
        }
    };

    const availableMonths = useMemo(() => {
        if (dates.length === 0) return [];
        const monthSet = new Set<string>();
        dates.forEach(date => {
            // date is in YYYY-MM-DD format, extract YYYY-MM
            monthSet.add(date.substring(0, 7));
        });
        return Array.from(monthSet).sort((a, b) => b.localeCompare(a));
    }, [dates]);

    const datesForMonth = useMemo(() => {
        if (!selectedMonth) return [];
        // Filter dates based on selectedMonth (YYYY-MM)
        return dates.filter(date => date.startsWith(selectedMonth));
    }, [dates, selectedMonth]);

    const handleFilterChange = (filter: Filter) => {
        setActiveFilter(filter);
        if (filter.type === 'date') {
            const today = getTodayInShanghai();
            if (today && filter.value === today) {
                const shanghaiHour = new Intl.DateTimeFormat('en-US', { hour: '2-digit', hour12: false, timeZone: 'Asia/Shanghai' })
                    .formatToParts(new Date())
                    .find(p => p.type === 'hour')?.value;
                const hourNum = shanghaiHour ? parseInt(shanghaiHour, 10) : new Date().getHours();
                let autoSlot: 'morning' | 'afternoon' | 'evening' | null = null;
                if (hourNum >= 0 && hourNum <= 11) autoSlot = 'morning';
                else if (hourNum >= 12 && hourNum <= 17) autoSlot = 'afternoon';
                else autoSlot = 'evening'; // 18-23
                setTimeSlot(autoSlot);
                fetchData(filter, autoSlot);
                return;
            } else {
                setTimeSlot(null);
                fetchData(filter, null);
                return;
            }
        }
        fetchData(filter);
    };

    const handleResetFilter = () => {
        // Reset to the default "Today's Briefing" view
        const today = getTodayInShanghai(); // Use timezone-aware today
        if (!today) return; // Handle case where today cannot be determined

        const resetFilter = { type: 'date' as const, value: today };
        handleFilterChange(resetFilter);
        setSelectedMonth(today.substring(0, 7)); // YYYY-MM format
        setTimeSlot(null);
    };
    
    const handleArticleStateChange = async (articleId: string | number, newTags: string[]) => {
        const updateArticleTagsInGroups = (groups: GroupedArticles, id: string | number, tags: string[]) => {
            const newGroups = { ...groups };
            for (const importance in newGroups) {
                newGroups[importance] = newGroups[importance].map(article =>
                    article.id === id ? { ...article, tags } : article
                );
            }
            return newGroups;
        };

        const updateArticleTagsInList = (articles: Article[], id: string | number, tags: string[]) => {
            return articles.map(article =>
                article.id === id ? { ...article, tags } : article
            );
        };

        const originalReports = reports;
        const originalFilteredArticles = filteredArticles;

        setReports(prevReports => prevReports.map(report => ({
            ...report,
            articles: updateArticleTagsInGroups(report.articles, articleId, newTags)
        })));
        setFilteredArticles(prevArticles => updateArticleTagsInList(prevArticles, articleId, newTags));

        try {
            const originalArticle = originalReports
                .flatMap(r => Object.values(r.articles).flat())
                .find(a => a.id === articleId) ||
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
            // 获取当前页面的所有文章ID
            let articleIds: (string | number)[] = [];
            
            if (activeFilter?.type === 'date' && reports.length > 0) {
                // 从简报中获取文章ID
                articleIds = reports.flatMap(report => 
                    Object.values(report.articles).flat().map(article => article.id)
                );
            } else if (filteredArticles.length > 0) {
                // 从过滤后的文章列表中获取文章ID
                articleIds = filteredArticles.map(article => article.id);
            }
            
            await markAllAsRead(articleIds);
            
            // 更新reports状态，将所有文章标记为已读
            if (activeFilter?.type === 'date' && reports.length > 0) {
                setReports(prevReports => 
                    prevReports.map(report => ({
                        ...report,
                        articles: Object.keys(report.articles).reduce((acc, key) => {
                            acc[key] = report.articles[key].map(article => {
                                // 如果文章不在articleIds中，则保持原样
                                if (!articleIds.includes(article.id)) {
                                    return article;
                                }
                                // 如果文章已在已读状态，则保持原样
                                if (article.tags.includes('user/-/state/com.google/read')) {
                                    return article;
                                }
                                // 添加已读标签
                                return {
                                    ...article,
                                    tags: [...article.tags, 'user/-/state/com.google/read']
                                };
                            });
                            return acc;
                        }, {} as GroupedArticles)
                    }))
                );
            }
            
            // 更新filteredArticles状态，将所有文章标记为已读
            if (filteredArticles.length > 0) {
                setFilteredArticles(prevArticles => 
                    prevArticles.map(article => {
                        // 如果文章不在articleIds中，则保持原样
                        if (!articleIds.includes(article.id)) {
                            return article;
                        }
                        // 如果文章已在已读状态，则保持原样
                        if (article.tags.includes('user/-/state/com.google/read')) {
                            return article;
                        }
                        // 添加已读标签
                        return {
                            ...article,
                            tags: [...article.tags, 'user/-/state/com.google/read']
                        };
                    })
                );
            }
        } catch (error) {
            console.error("UI: Failed to mark all as read.", error);
        } finally {
            setIsMarkingAsRead(false);
        }
    };

    const handleScrollToTop = () => {
        // 使用页面滚动而不是内部容器滚动，避免出现页面中间的滚动条
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
        }
        finally {
            setIsReaderLoading(false);
        }
    }, []);

    const handleShowArticleInMain = useCallback((article: Article) => {
        // Clear any ReaderView modal usage and show article inline
        setIsReaderVisible(false);
        setSidebarArticle(article);
        // keep readerContent empty - ArticleDetail will fetch on its own
    }, []);

    // const handlePreviewArticle = (url: string) => {
    //     setPreviewUrl(url);
    // };

    // 侧栏宽度变量：仅在 md+ 且未折叠时为 320px，否则为 0px
    const sidebarWidthVar = isMdUp && !isSidebarCollapsed ? '320px' : '0px';

    return (
        <div className="flex flex-col md:flex-row min-h-screen font-sans" style={{ '--sidebar-width': sidebarWidthVar } as React.CSSProperties}>
            {/* 侧栏容器，带折叠动画 */}
            <div
                className={`relative transition-all duration-300 ease-in-out overflow-hidden ${
                    isSidebarCollapsed ? 'md:w-0 w-0 transform -translate-x-full opacity-0 pointer-events-none' : 'md:w-80 w-full transform translate-x-0 opacity-100'
                }`}
            >
                <Sidebar 
                    dates={datesForMonth} // Re-introduced
                    isLoading={isLoading}
                    availableMonths={availableMonths} // Re-introduced
                    selectedMonth={selectedMonth} // Re-introduced
                    onMonthChange={setSelectedMonth} // Re-introduced
                    availableFilters={availableFilters}
                    activeFilter={activeFilter}
                    onFilterChange={handleFilterChange}
                    onOpenArticle={handleShowArticleInMain}
                    onRefresh={refreshSidebar}
                />
            </div>

            {/* 折叠/展开按钮：固定定位在“侧栏外右上角”，md+ 生效；移动端固定左上角 */}
            <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="fixed p-2 bg-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out border border-gray-200 hover:border-gray-300 fixed-collapse-expand-button"
                style={{
                    top: '12px',
                    left: isMdUp ? 'calc(256px + 12px)' : '12px',
                    zIndex: 50
                }}
            >
                {isSidebarCollapsed ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-800 transition-transform duration-300 hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-800 transition-transform duration-300 hover:rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <rect x="3" y="4" width="18" height="16" rx="2" strokeWidth="2" />
                        <path d="M9 4v16" strokeWidth="2" />
                    </svg>
                )}
            </button>

            {/* 更新目录按钮：固定定位在折叠按钮下方 */}
            <button
                onClick={refreshSidebar}
                disabled={isRefreshing}
                className="fixed flex flex-col items-center justify-center gap-1 px-2 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg text-sm text-white hover:from-blue-600 hover:to-indigo-700 focus:outline-none shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 fixed-update-directory-button"
                style={{
                    top: '52px', // 折叠按钮高度约40px + 12px间距
                    left: isMdUp ? 'calc(256px + 12px)' : '12px',
                    zIndex: 50
                }}
            >
                <div className="flex flex-col items-center justify-center">
                    {isRefreshing ? (
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M4 4v5h.582A7 7 0 1011 18.418V17a1 1 0 112 0v3a1 1 0 01-1 1H6a1 1 0 01-1-1V17a1 1 0 112 0v1.418A7 7 0 104.582 9H4z" />
                        </svg>
                    )}
                    <span className="mt-1" style={{ writingMode: 'vertical-lr', textOrientation: 'mixed' }}>{isRefreshing ? '正在更新' : '更新目录'}</span>
                </div>
            </button>

            <div ref={mainContentRef} className="flex-1 bg-stone-50 w-full max-w-4xl mx-auto px-4 md:px-8">
                {isLoading ? (
                    <LoadingSpinner />
                ) : sidebarArticle ? (
                    <ArticleDetail article={sidebarArticle} onClose={() => setSidebarArticle(null)} />
                ) : activeFilter?.type === 'date' ? (
                    <Briefing 
                        reports={reports} 
                        activeFilter={activeFilter}
                        timeSlot={timeSlot}
                        selectedReportId={selectedReportId}
                        availableTags={availableTags}
                        onReportSelect={setSelectedReportId}
                        onReaderModeRequest={handleOpenReader}
                        onStateChange={handleArticleStateChange}
                        onResetFilter={handleResetFilter}
                        onTimeSlotChange={(slot) => {
                            setTimeSlot(slot);
                            if (activeFilter && activeFilter.type === 'date') {
                                fetchData(activeFilter, slot);
                            }
                        }}
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
                {/* ArticlePreviewModal removed as per requirement */}
            </div>
        </div>
    );
};

export default App;