// App.tsx

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import Briefing from './components/Briefing';
import ReaderView from './components/ReaderView';
import ArticleDetail from './components/ArticleDetail';
import ArticleList from './components/ArticleList';
import TagPopover from './components/TagPopover';
import LoadingSpinner from './components/LoadingSpinner';
import Toast from './components/Toast';
import { Article, Tag, BriefingReport, GroupedArticles } from './types';
import { useArticleStore } from './store/articleStore';
import { useQueryClient } from '@tanstack/react-query';
import { useFilters } from './hooks/useFilters';
import { useReader } from './hooks/useReader';
import { getTodayInShanghai, getCurrentTimeSlotInShanghai } from './services/api';
import { 
    useBriefingArticles, 
    useFilteredArticles, 
    useUpdateArticleState,
    useMarkAllAsRead
} from './hooks/useArticles';

const App: React.FC = () => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
    const [isMdUp, setIsMdUp] = useState<boolean>(false);
    const [toast, setToast] = useState<{ isVisible: boolean; message: string; type: 'success' | 'error' | 'info' }>({ isVisible: false, message: '', type: 'info' });
    const [isMarkingSuccess, setIsMarkingSuccess] = useState(false);
    const [timeSlot, setTimeSlot] = useState<'morning' | 'afternoon' | 'evening' | null>(() => getCurrentTimeSlotInShanghai());
    const queryClient = useQueryClient();

    const articlesById = useArticleStore((state) => state.articlesById);
    const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ isVisible: true, message, type });
        setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 3000);
    }, []);

    const { 
        isInitialLoad,
        isRefreshing: isRefreshingFilters,
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

    const { data: briefingArticleIds, isLoading: isBriefingLoading, isFetching: isBriefingFetching } = useBriefingArticles(
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
        articleForReader,
        handleOpenReader,
        handleShowArticleInMain,
        handleCloseReader,
        handleCloseArticleDetail,
    } = useReader();

    const { mutateAsync: updateArticleState, isPending: isUpdatingArticle } = useUpdateArticleState();
  const [isRefreshingHome, setIsRefreshingHome] = useState(false);
    // 1. 【核心修复】从 useMarkAllAsRead Hook 中获取 isLoading 状态
    const { mutate: markAllAsRead, isPending: isMarkingAsRead } = useMarkAllAsRead();

    const handleArticleStateChange = (articleId: string | number, tagsToAdd: string[], tagsToRemove: string[]) => {
    // 【核心修改】现在 mutateAsync 会在 API 成功后才 resolve
    return updateArticleState({ articleId, tagsToAdd, tagsToRemove }, {
        onSuccess: (updatedArticle) => {
            // updatedArticle 是从 mutationFn 成功返回的数据
            // 我们用它来更新局部的 sidebarArticle 状态
            if (updatedArticle && sidebarArticle && sidebarArticle.id === updatedArticle.id) {
                handleShowArticleInMain(updatedArticle);
            }
        },
        onError: (error) => {
            // 可以在这里显示一个错误 Toast
            showToast('标签更新失败', 'error');
        }
    });
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
        // 在调用 mutate 之前，先清除可能残留的成功状态
        setIsMarkingSuccess(false); 
        
        markAllAsRead(idsToMark, {
            onSuccess: (markedIds) => {
                if (markedIds && markedIds.length > 0) {
                    // API 成功后，立即设置成功状态
                    setIsMarkingSuccess(true);
                    // 2秒后自动恢复正常状态
                    setTimeout(() => setIsMarkingSuccess(false), 2000);
                }
            },
            onError: () => {
                // 失败时，确保成功状态被清除
                setIsMarkingSuccess(false);
            }
        });
    } else {
        showToast('没有文章需要标记', 'info');
    }
};

const onFilterChange = useCallback((filter: Filter) => {
    handleFilterChange(filter);
    handleCloseArticleDetail();
    if (!isMdUp) setIsSidebarCollapsed(true);
}, [handleFilterChange, handleCloseArticleDetail, isMdUp]);

const onOpenArticle = useCallback((article: Article) => {
    handleShowArticleInMain(article);
    handleFilterChange(null);
    if (!isMdUp) setIsSidebarCollapsed(true);
}, [handleShowArticleInMain, handleFilterChange, isMdUp]);

const onMonthChange = useCallback((month: string) => {
    setSelectedMonth(month);
}, [setSelectedMonth]);

   // --- 将这一整段 handleRefreshToHome 函数替换掉 ---
    const handleRefreshToHome = useCallback(async () => {
    // 1. 关闭可能打开的全文视图
    handleCloseArticleDetail();
    
    // 2. 【新增】设置当前时间槽，确保获取最新的简报
    setTimeSlot(getCurrentTimeSlotInShanghai());

    // 3. 强制让所有 'briefing' 查询失效，这是触发重新获取的关键
    await queryClient.invalidateQueries({ queryKey: ['briefing'] });
    
    // 4. 调用 useFilters 提供的重置函数，这会更新 activeFilter
    //    并自动触发 useBriefingArticles 重新运行
    handleResetFilter();

    // 5. 滚动到页面顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // 6. 给出反馈 (已移除)
}, [queryClient, handleCloseArticleDetail, handleResetFilter, setTimeSlot]);

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
    
    const isLoading = isInitialLoad || isBriefingLoading || isFilterLoading || isBriefingFetching;

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
                    isInitialLoading={isInitialLoad}
                    isRefreshingFilters={isRefreshingFilters}
                    availableMonths={availableMonths}
                    selectedMonth={selectedMonth}
                    onMonthChange={onMonthChange}
                    availableFilters={availableFilters}
                    activeFilter={activeFilter}
                    activeArticleId={sidebarArticle?.id}
                    onFilterChange={onFilterChange}
                    onOpenArticle={onOpenArticle}
                    onRefresh={handleRefreshToHome}
                    datesForMonth={datesForMonth}
                />
            </div>

            <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className={`fixed top-5 p-2 bg-white rounded-full shadow-lg hover:shadow-xl duration-300 ease-in-out border border-gray-200 hover:border-gray-300 z-50
                    ${isReaderVisible && !isMdUp ? 'hidden' : ''}
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

            {/* Global Sidebar Toggle for Mobile (in-content) */}
            <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className={`md:hidden fixed top-5 right-5 z-10 p-2 rounded-full transition-all duration-300 ease-in-out
                    ${sidebarArticle || isReaderVisible ? 'hidden' : ''}
                    ${isSidebarCollapsed ? 'bg-gray-800 text-white' : 'bg-white/20 text-white'}
                `}
            >
                {isSidebarCollapsed ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="3" y="4" width="18" height="16" rx="2" strokeWidth="2" /><path d="M9 4v16" strokeWidth="2" /></svg>
                )}
            </button>

            <div ref={mainContentRef} className={`flex-1 bg-stone-50 w-full max-w-4xl mx-auto px-2 md:px-8 ${!isSidebarCollapsed && isMdUp ? 'md:ml-80' : ''}`}>
                {isLoading ? (
                    <LoadingSpinner />
                ) : sidebarArticle ? (
                   <ArticleDetail 
                    article={sidebarArticle} 
                    onClose={handleCloseArticleDetail}
                    availableUserTags={availableFilters.tags} // 【新增】
                  />
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
                        activeFilter={activeFilter}
                        availableUserTags={availableFilters.tags}
                    />
                ) : (
                    <div className="p-8 text-center text-gray-500">选择一个分类或标签查看文章。</div>
                )}
                
                <div className="fixed bottom-8 right-8 z-20 flex flex-col-reverse items-center gap-y-3">
                    {/* 【新增】手动刷新按钮 */}
                          <button 
                                onClick={handleRefreshToHome}
                                disabled={isBriefingFetching}
                                className="p-3 bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-950 transition-all"
                                aria-label="Back to today's briefing"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                                </svg>
                            </button>
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
                    {sidebarArticle ? (
                        <button
                            onClick={() => {
                                const STAR_TAG = 'user/-/state/com.google/starred';
                                const isStarred = sidebarArticle.tags?.includes(STAR_TAG);
                                handleArticleStateChange(sidebarArticle.id, isStarred ? [] : [STAR_TAG], isStarred ? [STAR_TAG] : []);
                            }}
                            disabled={isUpdatingArticle}
                            className={`p-3 text-white rounded-full shadow-lg transition-all disabled:bg-gray-500 ${
                                sidebarArticle.tags?.includes('user/-/state/com.google/starred') ? 'bg-amber-500 hover:bg-amber-600' : 'bg-gray-800 hover:bg-gray-950'
                            }`}
                            aria-label={sidebarArticle.tags?.includes('user/-/state/com.google/starred') ? 'Remove from favorites' : 'Add to favorites'}
                        >
                            {sidebarArticle.tags?.includes('user/-/state/com.google/starred') ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                </svg>
                            )}
                        </button>
                    ) : (
                        <button 
                            onClick={handleMarkAllClick}
                            disabled={isMarkingAsRead || isUpdatingArticle} 
                            className={`p-3 text-white rounded-full shadow-lg transition-all disabled:bg-gray-500 ${
                                isMarkingSuccess ? 'bg-green-500' : 'bg-gray-800 hover:bg-gray-950'
                            }`} 
                            aria-label="Mark all as read"
                        >
                            {isMarkingAsRead ? (
                                    <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                )}
                        </button>
                    )}
                    <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="p-3 bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-950 transition-all" aria-label="Back to top">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                    </button>
                </div>

                <ReaderView 
                    isVisible={isReaderVisible}
                    isLoading={isReaderLoading}
                    content={readerContent}
                    onClose={handleCloseReader}
                    article={articleForReader}
                    availableUserTags={availableFilters.tags}
                    onStateChange={handleArticleStateChange}
                    onGoHome={handleRefreshToHome}
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