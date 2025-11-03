// App.tsx

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import Briefing from './components/Briefing';
import ReaderView from './components/ReaderView';
import ArticleDetail from './components/ArticleDetail';
import ArticleList from './components/ArticleList';
import TagPopover from './components/TagPopover';
import { Article, Tag, BriefingReport, GroupedArticles } from './types';
import { useArticleStore } from './store/articleStore';

import { useFilters } from './hooks/useFilters';
import { useReader } from './hooks/useReader';
import { 
    useBriefingArticles, 
    useFilteredArticles, 
    useUpdateArticleState,
    useMarkAllAsRead
} from './hooks/useArticles';

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
    const icon = type === 'success' ? ( <svg className="w-6 h-6 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> ) : type === 'error' ? ( <svg className="w-6 h-6 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor"><path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> ) : ( <svg className="w-6 h-6 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> );
    return (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center p-4 rounded-lg shadow-lg text-white transition-all duration-300 transform ${bgColor}`} style={{ opacity: isVisible ? 1 : 0, transform: `translate(-50%, ${isVisible ? '0' : '20px'})` }}>
            {icon}
            <span className="ml-3 font-medium">{message}</span>
            <button onClick={onClose} className="ml-4 -mr-1 p-1.5 rounded-full hover:bg-white/20 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
        </div>
    );
};

const App: React.FC = () => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
    const [isMdUp, setIsMdUp] = useState<boolean>(false);
    const [toast, setToast] = useState<{ isVisible: boolean; message: string; type: 'success' | 'error' | 'info' }>({ isVisible: false, message: '', type: 'info' });
    const [isMarkingSuccess, setIsMarkingSuccess] = useState(false);
    const [timeSlot, setTimeSlot] = useState<'morning' | 'afternoon' | 'evening' | null>(null);
    
    const articlesById = useArticleStore((state) => state.articlesById);
    const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ isVisible: true, message, type });
        setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 3000);
    }, []);

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

    const { data: briefingArticleIds, isLoading: isBriefingLoading } = useBriefingArticles(
        activeFilter?.type === 'date' ? activeFilter.value : null,
        timeSlot
    );
    const { data: filteredArticleIdsFromQuery, isLoading: isFilterLoading } = useFilteredArticles(
        (activeFilter?.type === 'category' || activeFilter?.type === 'tag') ? activeFilter.value : null
    );

    const filteredArticleIds = filteredArticleIdsFromQuery || [];

    const reports: BriefingReport[] = useMemo(() => {
        if (!briefingArticleIds || briefingArticleIds.length === 0) return [];
        const articlesForReport = briefingArticleIds.map(id => articlesById[id]).filter(Boolean) as Article[];
        const groupedArticles = articlesForReport.reduce((acc, article) => {
            const group = article.briefingSection || '常规更新';
            if (!acc[group]) acc[group] = [];
            acc[group].push(article);
            return acc;
        }, {} as GroupedArticles);
        return [{ id: 1, title: "Daily Briefing", articles: groupedArticles }];
    }, [briefingArticleIds, articlesById]);

    const filteredArticles = useMemo(() => {
        return filteredArticleIds.map(id => articlesById[id]).filter(Boolean) as Article[];
    }, [filteredArticleIds, articlesById]);

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

    const { mutate: updateArticleState } = useUpdateArticleState();
    const { mutate: markAllAsRead, isLoading: isMarkingAsRead } = useMarkAllAsRead();

    const handleArticleStateChange = (articleId: string | number, tagsToAdd: string[], tagsToRemove: string[]) => {
        updateArticleState({ articleId, tagsToAdd, tagsToRemove });
    };

    const handleMarkAllClick = () => {
        let idsToMark: (string | number)[] = [];
        if (sidebarArticle) {
            idsToMark = [sidebarArticle.id];
        } else if (activeFilter?.type === 'date') {
            idsToMark = briefingArticleIds || [];
        } else if (activeFilter?.type === 'category' || activeFilter?.type === 'tag') {
            idsToMark = filteredArticleIds || [];
        }

        if (idsToMark.length > 0) {
            markAllAsRead(idsToMark, {
                onSuccess: () => {
                    showToast(`已将 ${idsToMark.length} 篇文章设为已读`, 'success');
                    setIsMarkingSuccess(true);
                    setTimeout(() => setIsMarkingSuccess(false), 2000);
                },
                onError: () => showToast('标记已读失败', 'error'),
            });
        } else {
            showToast('没有文章需要标记', 'info');
        }
    };

    const combinedRefresh = useCallback(async () => {
        await refreshFilters();
    }, [refreshFilters]);

    useEffect(() => {
        const updateViewport = () => {
            setIsSidebarCollapsed(window.innerWidth < 768);
            setIsMdUp(window.innerWidth >= 768);
        };
        updateViewport();
        window.addEventListener('resize', updateViewport);
        return () => window.removeEventListener('resize', updateViewport);
    }, []);

    const mainContentRef = useRef<HTMLDivElement | null>(null);
    const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);
    
    // 【核心修复】isLoading 的计算逻辑已更新
    const isLoading = isInitialLoad || isBriefingLoading || isFilterLoading;

    useEffect(() => {
        if (!isSidebarCollapsed && !isMdUp) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isSidebarCollapsed, isMdUp]);

    useEffect(() => {
        if (window.location.pathname === '/now') {
            handleResetFilter();
            window.history.replaceState(null, '', '/');
        }
    }, [handleResetFilter]);

    return (
        <div className="flex flex-col md:flex-row min-h-screen font-sans">
            {!isSidebarCollapsed && !isMdUp && (
                <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsSidebarCollapsed(true)} aria-hidden="true" />
            )}
            <div className={`h-full bg-gray-50 border-r border-gray-200 z-50 transition-all duration-300 ease-in-out ${!isMdUp ? `fixed top-0 left-0 w-64 ${isSidebarCollapsed ? '-translate-x-full' : 'translate-x-0'}` : `md:fixed md:top-0 md:bottom-0 md:left-0 md:w-80 md:overflow-y-auto ${isSidebarCollapsed ? 'md:w-0 md:opacity-0 md:overflow-hidden' : 'md:w-80 md:opacity-100'}`}`}>
                <Sidebar 
                    datesForMonth={datesForMonth}
                    isLoading={isInitialLoad}
                    availableMonths={availableMonths}
                    selectedMonth={selectedMonth}
                    onMonthChange={setSelectedMonth}
                    availableFilters={availableFilters}
                    activeFilter={activeFilter}
                    onFilterChange={(filter) => {
                        handleFilterChange(filter);
                        handleCloseArticleDetail();
                        if (!isMdUp) setIsSidebarCollapsed(true);
                    }}
                    onOpenArticle={(article) => {
                        handleShowArticleInMain(article);
                        handleFilterChange({ type: 'starredArticle', value: article.id.toString() });
                        if (!isMdUp) setIsSidebarCollapsed(true);
                    }}
                    onRefresh={combinedRefresh}
                />
            </div>

            {/* 【核心修复】补上缺失的按钮 */}
            <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className={`fixed top-5 p-2 bg-white rounded-full shadow-lg hover:shadow-xl duration-300 ease-in-out border border-gray-200 hover:border-gray-300 z-50
                    ${isReaderVisible ? 'hidden' : ''} 
                    ${activeFilter?.type === 'date' && !isMdUp ? 'hidden' : ''}
                    md:left-5 md:transition-all md:duration-300 ${isSidebarCollapsed ? 'md:left-5' : 'md:left-[304px]'}
                    right-5 md:right-auto 
                `}
            >
                {isSidebarCollapsed ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="3" y="4" width="18" height="16" rx="2" strokeWidth="2" /><path d="M9 4v16" strokeWidth="2" /></svg>
                )}
            </button>

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
                        selectedReportId={reports[0]?.id || null}
                        availableUserTags={availableFilters.tags}
                        onReportSelect={() => {}}
                        onReaderModeRequest={handleOpenReader}
                        onStateChange={handleArticleStateChange}
                        onResetFilter={handleResetFilter}
                        onTimeSlotChange={setTimeSlot}
                        isSidebarCollapsed={isSidebarCollapsed}
                        onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    />
                ) : (activeFilter?.type === 'category' || activeFilter?.type === 'tag') ? (
                    <ArticleList
                        articleIds={filteredArticleIds}
                        onOpenArticle={handleOpenReader}
                        isLoading={isLoading}
                    />
                ) : (
                    <div className="p-8 text-center text-gray-500">选择一个分类或标签查看文章。</div>
                )}
                
                <div className="fixed bottom-8 right-8 z-20 flex flex-col-reverse items-center gap-y-3">
                    {sidebarArticle && (
                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => setIsTagPopoverOpen(prev => !prev)} className="p-3 bg-sky-600 text-white rounded-full shadow-lg hover:bg-sky-700 transition-all" aria-label="Tag article">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a1 1 0 011-1h5a.997.997 0 01.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                            </button>
                            {isTagPopoverOpen && sidebarArticle && (
                                <TagPopover 
                                    article={sidebarArticle} 
                                    availableUserTags={availableFilters.tags}
                                    onClose={() => setIsTagPopoverOpen(false)} 
                                    onStateChange={handleArticleStateChange} 
                                />
                            )}
                        </div>
                    )}
                    <button 
                        onClick={handleMarkAllClick}
                        disabled={isMarkingAsRead} 
                        className={`p-3 text-white rounded-full shadow-lg transition-all disabled:bg-gray-500 ${isMarkingSuccess ? 'bg-green-500' : 'bg-gray-800 hover:bg-gray-950'}`} 
                        aria-label="Mark all as read"
                    >
                        {isMarkingAsRead ? (
                            <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        ) : (
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        )}
                    </button>
                    <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="p-3 bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-950 transition-all" aria-label="Back to top">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                    </button>
                </div>

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