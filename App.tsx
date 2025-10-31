import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Briefing from './components/Briefing';
import ReaderView from './components/ReaderView';
import ArticleDetail from './components/ArticleDetail';
import ArticleList from './components/ArticleList';
import { Tag } from './types';
import { getTags } from './services/api';

// Import custom hooks
import { useFilters } from './hooks/useFilters';
import { useDataFetching } from './hooks/useDataFetching';
import { useArticleManagement } from './hooks/useArticleManagement';
import { useReader } from './hooks/useReader';

const LoadingSpinner: React.FC = () => (
    <div className="flex items-center justify-center h-full w-full">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
    </div>
);

const App: React.FC = () => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
    const [isMdUp, setIsMdUp] = useState<boolean>(false);
    const [availableTags, setAvailableTags] = useState<Tag[]>([]);

    // Use custom hooks
    const { 
        isInitialLoad,
        datesForMonth,
        activeFilter,
        availableFilters,
        selectedMonth,
        setSelectedMonth,
        availableMonths,
        handleFilterChange,
        handleResetFilter,
        refreshFilters,
    } = useFilters();

    const { 
        reports,
        setReports, // Get the correct setter
        filteredArticles,
        setFilteredArticles, // Get the correct setter
        isLoading: isDataLoading,
        selectedReportId,
        setSelectedReportId,
        timeSlot,
        setTimeSlot,
        fetchData,
    } = useDataFetching({ activeFilter, isInitialLoad });

    const { 
        isMarkingAsRead,
        handleArticleStateChange,
        handleMarkAllAsRead,
    } = useArticleManagement({ reports, setReports, filteredArticles, setFilteredArticles }); // Pass the correct setters

    const { 
        readerContent,
        isReaderLoading,
        isReaderVisible,
        sidebarArticle,
        handleOpenReader,
        handleShowArticleInMain,
        handleCloseReader,
        handleCloseArticleDetail,
    } = useReader();

    // Combine refresh functions for the main refresh button
    const combinedRefresh = useCallback(async () => {
        await refreshFilters();
        if (activeFilter) {
            fetchData(activeFilter, timeSlot);
        }
    }, [refreshFilters, activeFilter, fetchData, timeSlot]);

    // Device width detection
    useEffect(() => {
        const updateViewport = () => {
            const isMobile = window.innerWidth < 768;
            const mdUp = window.innerWidth >= 768;
            setIsSidebarCollapsed(isMobile);
            setIsMdUp(mdUp);
        };
        updateViewport();
        window.addEventListener('resize', updateViewport);
        return () => window.removeEventListener('resize', updateViewport);
    }, []);

    // Fetch available tags for TagPopover
    useEffect(() => {
        setAvailableTags(availableFilters.tags.map(tag => ({ id: `user/-/label/${tag}`, label: tag })));
    }, [availableFilters.tags]);

    const mainContentRef = useRef<HTMLDivElement | null>(null);

    const handleScrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const isLoading = isInitialLoad || isDataLoading;

    return (
        <div className="flex flex-col md:flex-row min-h-screen font-sans">
            <div
                className={`relative transition-all duration-300 ease-in-out overflow-hidden ${
                    isSidebarCollapsed ? 'md:w-0 w-0 transform -translate-x-full opacity-0 pointer-events-none' : 'md:w-80 w-full transform translate-x-0 opacity-100'
                }`}
                style={{ '--sidebar-width': isMdUp && !isSidebarCollapsed ? '320px' : '0px' } as React.CSSProperties}
            >
                <Sidebar 
                    dates={datesForMonth}
                    isLoading={isLoading}
                    availableMonths={availableMonths}
                    selectedMonth={selectedMonth}
                    onMonthChange={setSelectedMonth}
                    availableFilters={availableFilters}
                    activeFilter={activeFilter}
                    onFilterChange={handleFilterChange}
                    onOpenArticle={handleShowArticleInMain}
                    onRefresh={combinedRefresh}
                    datesForMonth={datesForMonth}
                />
            </div>

            {/* Control Buttons */}
            <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="fixed p-2 bg-white rounded-lg shadow-lg hover:shadow-xl duration-300 ease-in-out border border-gray-200 hover:border-gray-300"
                style={{ top: '12px', left: '12px', transform: isMdUp && !isSidebarCollapsed ? 'translateX(305px)' : 'translateX(0)', transition: 'transform 0.3s ease-in-out', zIndex: 50 }}
            >
                {isSidebarCollapsed ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="3" y="4" width="18" height="16" rx="2" strokeWidth="2" /><path d="M9 4v16" strokeWidth="2" /></svg>
                )}
            </button>
            <button
                onClick={combinedRefresh}
                disabled={isLoading}
                className="fixed flex flex-col items-center justify-center gap-1 px-2 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg text-sm text-white hover:from-blue-600 hover:to-indigo-700 focus:outline-none shadow-md hover:shadow-lg duration-300 transform hover:scale-105"
                style={{ top: '64px', left: '12px', transform: isMdUp && !isSidebarCollapsed ? 'translateX(305px)' : 'translateX(0)', transition: 'transform 0.3s ease-in-out', zIndex: 50 }}
            >
                <div className="flex flex-col items-center justify-center">
                    {isLoading ? (
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M4 4v5h.582A7 7 0 1011 18.418V17a1 1 0 112 0v3a1 1 0 01-1 1H6a1 1 0 01-1-1V17a1 1 0 112 0v1.418A7 7 0 104.582 9H4z" /></svg>
                    )}
                    <span className="mt-1" style={{ writingMode: 'vertical-lr', textOrientation: 'mixed' }}>{isLoading ? '正在更新' : '更新目录'}</span>
                </div>
            </button>

            {/* Main Content */}
            <div ref={mainContentRef} className="flex-1 bg-stone-50 w-full max-w-4xl mx-auto px-4 md:px-8">
                {isLoading ? (
                    <LoadingSpinner />
                ) : sidebarArticle ? (
                    <ArticleDetail article={sidebarArticle} onClose={handleCloseArticleDetail} />
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
                
                {/* Floating Action Buttons */}
                <div className="fixed bottom-8 right-8 z-20 flex flex-col-reverse items-center gap-y-3">
                     <button onClick={handleScrollToTop} className="p-3 bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-950 transition-all" aria-label="Back to top">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                    </button>
                    <button onClick={() => handleMarkAllAsRead(activeFilter?.type || 'date')} disabled={isMarkingAsRead} className="p-3 bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-950 transition-all disabled:bg-gray-500" aria-label="Mark all as read">
                        {isMarkingAsRead ? (
                            <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        ) : (
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        )}
                    </button>
                </div>

                <ReaderView 
                    isVisible={isReaderVisible}
                    isLoading={isReaderLoading}
                    content={readerContent}
                    onClose={handleCloseReader}
                />
            </div>
        </div>
    );
};

export default App;