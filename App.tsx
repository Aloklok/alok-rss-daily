// App.tsx

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import Briefing from './components/Briefing';
import ReaderView from './components/ReaderView';
import ArticleDetail from './components/ArticleDetail';
import ArticleList from './components/ArticleList';
import TagPopover from './components/TagPopover';
import { Article, Tag, BriefingReport, GroupedArticles } from './types';
import { editArticleTag, editArticleState, markAllAsRead as apiMarkAllAsRead } from './services/api';
import { useArticleStore } from './store/articleStore';

import { useFilters } from './hooks/useFilters';
import { useDataFetching } from './hooks/useDataFetching';
import { useReader } from './hooks/useReader';

// It's recommended to move LoadingSpinner and Toast to their own files in components/
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
    return (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center p-4 rounded-lg shadow-lg text-white transition-all duration-300 transform ${bgColor}`}>
            <span className="font-medium">{message}</span>
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
    
    const { articlesById, updateArticle } = useArticleStore();

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

    const { 
        reportStructure,
        filteredArticleIds,
        isLoading: isDataLoading,
        timeSlot,
        setTimeSlot,
        fetchData,
    } = useDataFetching({ activeFilter, isInitialLoad });
    
    // 从 Store 和 reportStructure 重构完整的 reports
    const reports: BriefingReport[] = useMemo(() => {
        if (!reportStructure || reportStructure.length === 0) return [];
        return reportStructure.map((struct: any) => ({
            id: struct.id,
            title: struct.title,
            articles: Object.fromEntries(
                Object.entries(struct.articles).map(([key, ids]: [string, any]) => [
                    key,
                    ids.map((id: string | number) => articlesById[id]).filter(Boolean)
                ])
            )
        }));
    }, [reportStructure, articlesById]);

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

const handleArticleStateChange = useCallback(async (articleId: string | number, tagsToAdd: string[], tagsToRemove: string[]) => {
    const articleToUpdate = articlesById[articleId];
    if (!articleToUpdate) return;

    const originalTags = articleToUpdate.tags || [];
    
    // 创建一个新的 Set 来计算最终的 tags，确保包含了所有类型的标签
    const finalTagsSet = new Set(originalTags);
    tagsToAdd.forEach(tag => finalTagsSet.add(tag));
    tagsToRemove.forEach(tag => finalTagsSet.delete(tag));
    
    const finalNewTags = Array.from(finalTagsSet);
    const updatedArticle = { ...articleToUpdate, tags: finalNewTags };
    
    // 乐观更新 UI 和所有 Store 状态
    updateArticle(updatedArticle);
    if (sidebarArticle && sidebarArticle.id === articleId) {
        handleShowArticleInMain(updatedArticle);
    }

    try {
        // 调用 API 与后端同步
        // 这个逻辑现在可以同时处理复杂标签编辑和简单的状态切换
        await editArticleTag(articleId, tagsToAdd, tagsToRemove);

    } catch (error) {
        // 回滚
        updateArticle(articleToUpdate);
        if (sidebarArticle && sidebarArticle.id === articleId) {
            handleShowArticleInMain(articleToUpdate);
        }
        showToast('状态更新失败', 'error');
    }
}, [articlesById, sidebarArticle, handleShowArticleInMain, updateArticle, showToast]);

    const [isMarkingAsRead, setIsMarkingAsRead] = useState(false);
    const handleMarkAllAsRead = useCallback(async (context: 'singleArticle' | 'date' | 'category' | 'tag', articleIdsToMark?: (string|number)[]) => {
        setIsMarkingAsRead(true);
        let finalArticleIds: (string|number)[] = [];
        if (context === 'singleArticle' && articleIdsToMark) {
            finalArticleIds = articleIdsToMark;
        } else if (context === 'date') {
            finalArticleIds = reports.flatMap(r => Object.values(r.articles).flat().map(a => a.id));
        } else if (context === 'category' || context === 'tag') {
            finalArticleIds = filteredArticleIds;
        }

        if (finalArticleIds.length === 0) {
            setIsMarkingAsRead(false);
            return 0;
        }

        const articlesToUpdate = finalArticleIds.map(id => articlesById[id]).filter(Boolean) as Article[];
        const originalArticles = articlesToUpdate.map(a => ({...a})); // Deep copy for rollback

        const updatedArticles = articlesToUpdate.map(article => {
            if (article.tags?.includes('user/-/state/com.google/read')) return article;
            const newTags = [...(article.tags || []), 'user/-/state/com.google/read'];
            return { ...article, tags: newTags };
        });

        updatedArticles.forEach(updateArticle);

        try {
            await apiMarkAllAsRead(finalArticleIds);
            return finalArticleIds.length;
        } catch (error) {
            originalArticles.forEach(updateArticle); // Rollback
            showToast('标记已读失败', 'error');
            return 0;
        } finally {
            setIsMarkingAsRead(false);
        }
    }, [reports, filteredArticleIds, articlesById, updateArticle, showToast]);

    const combinedRefresh = useCallback(async () => {
        await refreshFilters();
        if (activeFilter) {
            fetchData(activeFilter, timeSlot, true);
        }
    }, [refreshFilters, activeFilter, fetchData, timeSlot]);

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
    const isLoading = isInitialLoad || isDataLoading;
    
    return (
        <div className="flex flex-col md:flex-row min-h-screen font-sans">
            {!isSidebarCollapsed && !isMdUp && (
                <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsSidebarCollapsed(true)} aria-hidden="true" />
            )}
            <div className={`h-full bg-gray-50 border-r border-gray-200 z-50 ...`}>
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
            <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className={`fixed top-5 ...`}>
                {/* ... SVG icons */}
            </button>
            <div ref={mainContentRef} className={`flex-1 bg-stone-50 ...`}>
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
                        onClick={async () => {
                            const type = sidebarArticle ? 'singleArticle' : activeFilter!.type;
                            const ids = sidebarArticle ? [sidebarArticle.id] : undefined;
                            const markedCount = await handleMarkAllAsRead(type as any, ids);
                            if (markedCount > 0) {
                                showToast(`已将 ${markedCount} 篇文章设为已读`, 'success');
                                setIsMarkingSuccess(true);
                                setTimeout(() => setIsMarkingSuccess(false), 2000);
                            } else {
                                showToast('没有新的文章需要标记为已读。', 'info');
                            }
                        }} 
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