// App.tsx

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import FloatingActionButtons from './components/FloatingActionButtons'; // 【增】导入新组件
import Sidebar from './components/Sidebar';
import Briefing from './components/Briefing';
import ReaderView from './components/ReaderView';
import ArticleDetail from './components/ArticleDetail';
import ArticleList from './components/ArticleList';
import LoadingSpinner from './components/LoadingSpinner';
import Toast from './components/Toast';
import { Article, Tag, BriefingReport, GroupedArticles, Filter } from './types';
import { useArticleStore, selectSelectedArticle } from './store/articleStore';
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
import { useArticleMetadata } from './hooks/useArticleMetadata'; // 【增】导入 Hook

const App: React.FC = () => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
    const [isMdUp, setIsMdUp] = useState<boolean>(false);
    const [toast, setToast] = useState<{ isVisible: boolean; message: string; type: 'success' | 'error' | 'info' }>({ isVisible: false, message: '', type: 'info' });
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
        availableFilters,
        selectedMonth,
        setSelectedMonth,
        availableMonths,
        handleFilterChange,
        handleResetFilter,
        refreshFilters,
        dailyStatuses, // 【增】
        handleToggleDailyStatus, // 【增】
    } = useFilters();

    const activeFilter = useArticleStore(state => state.activeFilter);

    const { data: briefingArticleIds, isLoading: isBriefingLoading, isFetching: isBriefingFetching } = useBriefingArticles(
    activeFilter?.type === 'date' ? activeFilter.value : null,
    timeSlot
);
    
    const { data: filteredArticleIdsFromQuery, isLoading: isFilterLoading } = useFilteredArticles(
        (activeFilter?.type === 'category' || activeFilter?.type === 'tag') ? activeFilter.value : null
    );

    const filteredArticleIds = filteredArticleIdsFromQuery || [];


    // 【核心逻辑】计算当前视图中未读文章的 ID 列表
    const unreadArticleIdsInView = useMemo(() => {
        const READ_TAG = 'user/-/state/com.google/read';
        let articleIdsToCheck: (string | number)[] = [];

        // 根据当前激活的过滤器确定要检查的文章范围
        if (activeFilter?.type === 'date') {
            articleIdsToCheck = briefingArticleIds || [];
        } else if (activeFilter?.type === 'category' || activeFilter?.type === 'tag') {
            articleIdsToCheck = filteredArticleIds || [];
        }

        // 筛选出其中未读的文章
        return articleIdsToCheck
            .map(id => articlesById[id])
            .filter(article => article && !article.tags?.includes(READ_TAG))
            .map(article => article.id);
    }, [activeFilter, briefingArticleIds, filteredArticleIds, articlesById]);

    const handleMarkAllClick = () => {
        // 【改】现在我们只标记当前视图中未读的文章
        if (unreadArticleIdsInView.length > 0) {
            markAllAsRead(unreadArticleIdsInView);
        } else {
            showToast('没有需要标记的文章', 'info');
        }
    };

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
        articleForReader,
        handleOpenReader,
        handleShowArticleInMain,
        handleCloseReader,
        handleCloseArticleDetail,
    } = useReader();

    const sidebarArticle = useArticleStore(selectSelectedArticle);
    const isReaderVisible = useArticleStore(state => state.isReaderVisible);

    const mainContentArticleId = sidebarArticle?.id; // 用于主内容区判断是否显示 ArticleDetail

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


const onFilterChange = useCallback((filter: Filter) => {
    // handleFilterChange(filter); // 移除此行
    handleCloseArticleDetail();
    if (!isMdUp) setIsSidebarCollapsed(true);
}, [handleCloseArticleDetail, isMdUp]);



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
                    onOpenArticle={handleShowArticleInMain}
                    onRefresh={refreshFilters}
                    datesForMonth={datesForMonth}
                    dailyStatuses={dailyStatuses}
                    onToggleDailyStatus={handleToggleDailyStatus}
                />
            </div>


            {/* ... (侧边栏展开/折叠按钮) ... */}
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

            {/*   ... (侧边栏展开/折叠按钮) ...  for Mobile (in-content) */}
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

            <div ref={mainContentRef} className={`flex-1 bg-stone-50 w-full max-w-3xl mx-auto px-2 md:px-8 ${!isSidebarCollapsed && isMdUp ? 'md:ml-80' : ''}`}>
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
                        timeSlot={timeSlot}
                        selectedReportId={reports[0]?.id || null}
                        availableUserTags={availableFilters.tags}
                        onReportSelect={() => {}}
                        onReaderModeRequest={handleOpenReader}
                        onStateChange={handleArticleStateChange}
                        onTimeSlotChange={setTimeSlot}
                        isSidebarCollapsed={isSidebarCollapsed}
                        onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        articleCount={briefingArticleIds?.length || 0}
                    />
                ) : (activeFilter?.type === 'category' || activeFilter?.type === 'tag') ? (
                    <ArticleList
                        articleIds={filteredArticleIds}
                        onOpenArticle={handleOpenReader}
                        isLoading={isLoading}
                        availableUserTags={availableFilters.tags}
                    />
                ) : (
                    <div className="p-8 text-center text-gray-500">选择一个分类或标签查看文章。</div>
                )}
                
                {/* 【增】浮动按钮 FloatingActionButtons 组件 */}
            <FloatingActionButtons
                selectedArticle={sidebarArticle}
                isBriefingFetching={isBriefingFetching}
                isUpdatingArticle={isUpdatingArticle}
                isMarkingAsRead={isMarkingAsRead}
                availableUserTags={availableFilters.tags}
                hasUnreadInView={unreadArticleIdsInView.length > 0}
                onArticleStateChange={handleArticleStateChange}
                onMarkAllClick={handleMarkAllClick}
                onRefreshToHome={handleRefreshToHome}
            />

                <ReaderView 
                    isVisible={isReaderVisible}
                    isLoading={isReaderLoading}
                    content={readerContent}
                    onClose={handleCloseReader}
                    availableUserTags={availableFilters.tags}
                    onStateChange={handleArticleStateChange}
                    onGoHome={handleRefreshToHome}
                    article={articleForReader}
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