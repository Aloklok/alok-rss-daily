import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import Briefing from './components/Briefing';
import ReaderView from './components/ReaderView';
import ArticleDetail from './components/ArticleDetail';
import ArticleList from './components/ArticleList';
import { Article, Tag } from './types';
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

interface ToastProps {
    message: string;
    isVisible: boolean;
    onClose: () => void;
    type?: 'success' | 'error' | 'info';
}

const Toast: React.FC<ToastProps> = ({ message, isVisible, onClose, type = 'info' }) => {
    if (!isVisible) return null;

    const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-gray-800';
    const icon = type === 'success' ? (
        <svg className="w-6 h-6 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
    ) : type === 'error' ? (
        <svg className="w-6 h-6 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
    ) : (
        <svg className="w-6 h-6 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
    );

    return (
        <div 
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center p-4 rounded-lg shadow-lg text-white transition-all duration-300 transform ${bgColor}`}
            style={{ opacity: isVisible ? 1 : 0, transform: `translate(-50%, ${isVisible ? '0' : '20px'})` }}
        >
            {icon}
            <span className="ml-3 font-medium">{message}</span>
            <button onClick={onClose} className="ml-4 -mr-1 p-1.5 rounded-full hover:bg-white/20 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
        </div>
    );
};

interface TagPopoverProps {
    article: Article;
    availableTags: Tag[];
    onClose: () => void;
    onStateChange: (articleId: string | number, newTags: string[]) => Promise<void>;
}

const TagPopover: React.FC<TagPopoverProps> = ({ article, availableTags, onClose, onStateChange }) => {
    const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set(article.tags?.filter(t => !t.startsWith('user/-/state')).map(t => t.replace(/\/\d+\//, '/-/')) || []));
    const [isSaving, setIsSaving] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);

    const handleTagChange = (tagId: string) => {
        setSelectedTags(prev => {
            const newSet = new Set(prev);
            if (newSet.has(tagId)) newSet.delete(tagId);
            else newSet.add(tagId);
            return newSet;
        });
    };

    const handleConfirm = async () => {
        setIsSaving(true);
        const stateTags = (article.tags || []).filter(t => t && t.startsWith('user/-/state'));
        const newTags = [...stateTags, ...Array.from(selectedTags)];
        try {
            await onStateChange(article.id, newTags);
            onClose();
        } catch (error) {
            console.error("Failed to save tags", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div ref={popoverRef} className="absolute bottom-full mb-2 w-64 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 right-0 md:left-1/2 md:-translate-x-1/2" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b"><h4 className="font-semibold text-gray-800">编辑标签</h4></div>
            {availableTags.length === 0 ? (
                <div className="p-4 text-center text-gray-500">暂无可用标签。</div>
            ) : (
                <div className="p-4 max-h-60 overflow-y-auto">
                    <div className="space-y-3">
                        {availableTags.map(tag => (
                            <label key={tag.id} className="flex items-center space-x-3 cursor-pointer">
                                <input type="checkbox" checked={selectedTags.has(tag.id)} onChange={() => handleTagChange(tag.id)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                <span className="text-gray-700">{tag.label}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}
            <div className="p-3 bg-gray-50 flex justify-end space-x-2 rounded-b-lg">
                <button onClick={onClose} className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">取消</button>
                <button onClick={handleConfirm} disabled={isSaving} className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:bg-blue-300">{isSaving ? '保存中...' : '确认'}</button>
            </div>
        </div>
    );
};

const App: React.FC = () => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
    const [isMdUp, setIsMdUp] = useState<boolean>(false);
    const [availableTags, setAvailableTags] = useState<Tag[]>([]);
    const [toast, setToast] = useState<{ isVisible: boolean; message: string; type: 'success' | 'error' | 'info' }>({ isVisible: false, message: '', type: 'info' });

    const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ isVisible: true, message, type });
        const timer = setTimeout(() => {
            setToast(prev => ({ ...prev, isVisible: false }));
        }, 3000); // Hide after 3 seconds
        return () => clearTimeout(timer);
    }, []);

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
        clearActiveFilterAndCache, // Get the new function
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
        setAvailableTags(availableFilters.tags.map(tag => ({ id: tag.id, label: tag.label })));
    }, [availableFilters.tags]);

    const mainContentRef = useRef<HTMLDivElement | null>(null);
    const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);

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

    // Effect to handle /now URL for immediate navigation to today's briefing
    useEffect(() => {
        if (window.location.pathname === '/now') {
            handleResetFilter();
            // Replace the URL to / without triggering another reload
            window.history.replaceState(null, '', '/');
        }
    }, [handleResetFilter]);

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
                    datesForMonth={datesForMonth} // Pass datesForMonth here
                    isLoading={isInitialLoad}
                    availableMonths={availableMonths}
                    selectedMonth={selectedMonth}
                    onMonthChange={setSelectedMonth}
                    availableFilters={availableFilters}
                    activeFilter={activeFilter}
                    onFilterChange={(filter) => {
                        handleFilterChange(filter);
                        handleCloseArticleDetail();
                        // The clearing of sessionStorage for activeFilter is now handled by clearActiveFilterAndCache
                        // when navigating to an article detail.
                        if (!isMdUp) setIsSidebarCollapsed(true); // Auto-close on mobile after selection
                    }}
                    onOpenArticle={(article) => {
                        handleShowArticleInMain(article);
                        handleFilterChange({ type: 'starredArticle', value: article.id.toString() });
                        if (!isMdUp) setIsSidebarCollapsed(true); // Auto-close on mobile
                    }}
                    onRefresh={combinedRefresh}
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
                    <button 
                        onClick={async () => {
                            let markedCount = 0;
                            if (sidebarArticle) {
                                markedCount = await handleMarkAllAsRead('singleArticle', [sidebarArticle.id]);
                            } else {
                                markedCount = await handleMarkAllAsRead(activeFilter?.type || 'date');
                            }
                            if (markedCount > 0) {
                                showToast(`已将 ${markedCount} 篇文章设为已读`, 'success');
                            } else {
                                showToast('没有新的文章需要标记为已读。', 'info');
                            }
                        }} 
                        disabled={isMarkingAsRead} 
                        className="p-3 bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-950 transition-all disabled:bg-gray-500" 
                        aria-label="Mark all as read"
                    >
                        {isMarkingAsRead ? (
                            <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        ) : (
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        )}
                    </button>
                    <button onClick={handleScrollToTop} className="p-3 bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-950 transition-all" aria-label="Back to top">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                    </button>
                    {sidebarArticle && (
                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => setIsTagPopoverOpen(prev => !prev)} className="p-3 bg-sky-600 text-white rounded-full shadow-lg hover:bg-sky-700 transition-all" aria-label="Tag article">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a1 1 0 011-1h5a.997.997 0 01.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                            </button>
                            {isTagPopoverOpen && sidebarArticle && (
                                <TagPopover 
                                    article={sidebarArticle} 
                                    availableTags={availableTags} 
                                    onClose={() => setIsTagPopoverOpen(false)} 
                                    onStateChange={handleArticleStateChange} 
                                />
                            )}
                        </div>
                    )}
                </div> {/* Closing tag for Floating Action Buttons */}

                <ReaderView 
                    isVisible={isReaderVisible}
                    isLoading={isReaderLoading}
                    content={readerContent}
                    onClose={handleCloseReader}
                />
                <Toast 
                    message={toast.message} 
                    isVisible={toast.isVisible} 
                    onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
                    type={toast.type}
                />
            </div>
        </div>
    );
};

export default App;