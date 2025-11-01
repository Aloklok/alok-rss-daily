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
    } = useArticleManagement({ reports, setReports, filteredArticles, setFilteredArticles, activeFilter, timeSlot }); // Pass the correct setters

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
            fetchData(activeFilter, timeSlot, true);
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

    // Effect to lock body scroll when mobile sidebar is open
    useEffect(() => {
        if (!isSidebarCollapsed && !isMdUp) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        // Cleanup function to reset style on component unmount
        return () => {
            document.body.style.overflow = '';
        };
    }, [isSidebarCollapsed, isMdUp]);

    return (
        <div className="flex flex-col md:flex-row min-h-screen font-sans">
            {/* Backdrop for mobile */}
            {!isSidebarCollapsed && !isMdUp && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40" 
                    onClick={() => setIsSidebarCollapsed(true)}
                    aria-hidden="true"
                />
            )}

            <div
                className={`h-full bg-gray-50 border-r border-gray-200 z-50 transition-all duration-300 ease-in-out
                    ${!isMdUp // Mobile specific styles
                        ? `fixed top-0 left-0 w-64 ${isSidebarCollapsed ? '-translate-x-full' : 'translate-x-0'}`
                        : `md:fixed md:top-0 md:bottom-0 md:left-0 md:w-80 md:overflow-y-auto ${isSidebarCollapsed ? 'md:w-0 md:opacity-0 md:overflow-hidden' : 'md:w-80 md:opacity-100'}` // Desktop specific styles
                    }
                `}
            >
                <Sidebar 
                    dates={datesForMonth}
                    isLoading={isLoading}
                    availableMonths={availableMonths}
                    selectedMonth={selectedMonth}
                    onMonthChange={setSelectedMonth}
                    availableFilters={availableFilters}
                    activeFilter={activeFilter}
                    onFilterChange={(filter) => {
                        handleFilterChange(filter);
                        if (!isMdUp) setIsSidebarCollapsed(true); // Auto-close on mobile after selection
                    }}
                    onOpenArticle={(article) => {
                        handleShowArticleInMain(article);
                        if (!isMdUp) setIsSidebarCollapsed(true); // Auto-close on mobile
                    }}
                    onRefresh={combinedRefresh}
                    datesForMonth={datesForMonth}
                />
            </div>

            {/* Control Buttons */}
            <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className={`fixed p-2 bg-white rounded-full shadow-lg hover:shadow-xl duration-300 ease-in-out border border-gray-200 hover:border-gray-300 ${isReaderVisible ? 'hidden' : ''} ${activeFilter?.type === 'date' && !isMdUp ? 'hidden' : ''}`}
                style={{
                    top: '20px',
                    left: isMdUp ? (isSidebarCollapsed ? '20px' : '304px') : '20px',
                    transition: 'left 0.3s ease-in-out',
                    zIndex: 50
                }}
            >
                {isSidebarCollapsed ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-800" fill="none" viewBox="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-800" fill="none" viewBox="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="3" y="4" width="18" height="16" rx="2" strokeWidth="2" /><path d="M9 4v16" strokeWidth="2" /></svg>
                )}
            </button>


            {/* Main Content */}
            <div ref={mainContentRef} className={`flex-1 bg-stone-50 w-full max-w-4xl mx-auto px-2 md:px-8 ${!isSidebarCollapsed && isMdUp ? 'md:ml-80' : ''}`}>
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
                        isSidebarCollapsed={isSidebarCollapsed}
                        onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
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