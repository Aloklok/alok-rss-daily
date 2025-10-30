import React, { useState, useEffect } from 'react';
import { Article } from '../types';
import { getStarredArticles } from '../services/api';
import { Filter, AvailableFilters } from '../types';

interface SidebarProps {
    dates: string[];
    isLoading: boolean;
    availableMonths: string[];
    selectedMonth: string;
    onMonthChange: (month: string) => void;
    availableFilters: AvailableFilters;
    activeFilter: Filter | null;
    onFilterChange: (filter: Filter) => void;
    onOpenArticle?: (article: Article) => void;
    onRefresh?: () => Promise<void>;
}

type ActiveTab = 'filters' | 'calendar';

const formatMonthForDisplay = (month: string) => {
    if (!month) return '';
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });
};

const Sidebar: React.FC<SidebarProps> = ({
    dates,
    isLoading,
    availableMonths,
    selectedMonth,
    onMonthChange,
    availableFilters,
    activeFilter,
    onFilterChange,
    onOpenArticle,
    onRefresh,
}) => {
    const [activeTab, setActiveTab] = useState<ActiveTab>('filters');
    const [starredExpanded, setStarredExpanded] = useState<boolean>(false);
    const [starredArticles, setStarredArticles] = useState<Article[]>([]);
    const [isLoadingStarred, setIsLoadingStarred] = useState<boolean>(false);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

    const isFilterActive = (type: Filter['type'], value: string) => {
       
        return activeFilter?.type === type && activeFilter?.value === value;
    };

    const chipButtonClass = (isActive: boolean) =>
        `flex items-center gap-2 px-3 py-1.5 border rounded-md text-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
            isActive
                ? 'bg-gray-800 text-white border-gray-800 font-semibold'
                : 'bg-gray-100 border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-200'
        }`;
        
    const listItemButtonClass = (isActive: boolean) => 
        `w-full text-left px-3 py-2 rounded-lg transition-colors duration-200 flex items-center gap-3 text-gray-700 ${
            isActive
                ? 'bg-gray-800 text-white font-semibold'
                : 'text-gray-600 hover:bg-gray-100'
        }`;

    const tabButtonClass = (isActive: boolean) =>
        `text-sm font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 rounded-md py-2 ${
            isActive ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:bg-gray-100'
        }`;
    
    // 移除自动加载收藏文章的useEffect，改为在展开时加载

    const handleRefreshClick = async () => {
        if (!onRefresh) return;
        setIsRefreshing(true);
        try {
            // Ask parent to refresh filters/dates
            await onRefresh();

            // If starred panel is collapsed, refresh starred list here; otherwise skip per requirement
            if (!starredExpanded) {
                setIsLoadingStarred(true);
                try {
                    const data = await getStarredArticles();
                    setStarredArticles(data as Article[]);
                } catch (e) {
                    console.error('Failed to refresh starred articles on refresh click', e);
                }
                finally {
                    setIsLoadingStarred(false);
                }
            }
        }
        finally {
            setIsRefreshing(false);
        }
    };

    const renderFiltersTab = () => (
        <div className="space-y-4">
             <nav className="flex flex-col gap-1.5">
                <div>
                    <button
                        onClick={async () => {
                            // toggle expand state
                            const newExpandedState = !starredExpanded;
                            setStarredExpanded(newExpandedState);
                            
                            // 只在展开时获取收藏数据
                            if (newExpandedState) {
                                setIsLoadingStarred(true);
                                try {
                                    const data = await getStarredArticles();
                                    setStarredArticles(data as Article[]);
                                } catch (e) {
                                    console.error('Failed to load starred articles on expand', e);
                                } finally {
                                    setIsLoadingStarred(false);
                                }
                            }
                        }}
                        className={listItemButtonClass(isFilterActive('starred', 'true'))}
                    >
                        <span>⭐</span>
                        <span className="flex-1">我的收藏</span>
                        <svg className={`h-4 w-4 transition-transform ${starredExpanded ? 'rotate-90' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>

                    {starredExpanded && (
                        <div className="mt-2 ml-2 border-l pl-3 space-y-1">
                            {isLoadingStarred ? (
                                <div className="space-y-2">
                                    {[...Array(3)].map((_, i) => <div key={i} className="h-8 bg-gray-200 rounded animate-pulse"></div>)}
                                </div>
                            ) : (
                                starredArticles.length === 0 ? (
                                    <div className="text-sm text-gray-500">暂无收藏</div>
                                ) : (
                                    starredArticles.map(article => (
                                        <button
                                            key={article.id}
                                            onClick={() => {
                                                if (onOpenArticle) {
                                                    onOpenArticle(article);
                                                } else {
                                                    onFilterChange({ type: 'starred', value: 'true' });
                                                }
                                            }}
                                            className="w-full text-left text-sm text-gray-700 hover:bg-gray-100 px-2 py-1 rounded"
                                        >
                                            {article.title}
                                        </button>
                                    ))
                                )
                            )}
                        </div>
                    )}
                </div>
            </nav>

            <div>
                <h2 className="text-base font-semibold text-gray-800 my-3">分类</h2>
                <nav className="flex flex-col gap-1.5">
                    {availableFilters.categories.map(category => (
                        <button
                            key={category}
                            onClick={() => onFilterChange({ type: 'category', value: category })}
                            className={listItemButtonClass(isFilterActive('category', category))}
                        >
                            <span>{category}</span>
                        </button>
                    ))}
                </nav>
            </div>
             <div>
                <h2 className="text-base font-semibold text-gray-800 my-3">标签</h2>
                <div className="flex flex-wrap gap-2">
                     {availableFilters.tags.map(tag => (
                        <button
                            key={tag}
                             onClick={() => onFilterChange({ type: 'tag', value: tag })}
                            className={chipButtonClass(isFilterActive('tag', tag))}
                        >
                            #{tag}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderCalendarTab = () => (
        <div className="flex flex-col h-full">
            {isLoading ? (
                <div className="space-y-2">
                    {[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-gray-200 rounded-lg animate-pulse"></div>)}
                </div>
            ) : (
              <nav className="flex flex-col gap-1.5 flex-grow">
                {dates.map(date => {
                    const isActive = isFilterActive('date', date);
                    const dateObj = new Date(date);
                    const displayDatePart = dateObj.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
                    const displayDayOfWeekPart = dateObj.toLocaleDateString('zh-CN', { weekday: 'short' });

                    return (
                      <button
                        key={date}
                        onClick={() => onFilterChange({ type: 'date', value: date })}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors duration-200 flex justify-between items-center ${
                            isActive
                                ? 'bg-gray-800 text-white font-semibold'
                                : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <span>{displayDatePart}</span>
                        <span className="text-xs">{displayDayOfWeekPart}</span>
                      </button>
                    );
                })}
              </nav>
            )}
            <div className="mt-auto pt-4">
              <div className="relative">
                  <select
                      value={selectedMonth}
                      onChange={e => onMonthChange(e.target.value)}
                      className="w-full appearance-none bg-transparent border-none text-gray-800 py-2 pl-3 pr-8 rounded-md focus:outline-none cursor-pointer absolute inset-0 z-10 opacity-0"
                  >
                      {availableMonths.map(month => (
                          <option key={month} value={month}>
                              {formatMonthForDisplay(month)}
                          </option>
                      ))}
                  </select>
                  <div className="w-full flex items-center justify-between bg-gray-100 border border-gray-300 text-gray-800 py-2 px-3 rounded-md pointer-events-none">
                      <span>{formatMonthForDisplay(selectedMonth)}</span>
                      <svg className="h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                  </div>
              </div>
            </div>
        </div>
    );

    return (
        <aside className="flex flex-col flex-shrink-0 bg-gray-50 border-r border-gray-200 w-full md:w-80 p-4 space-y-4">
            <h1 className="text-2xl font-bold text-gray-900 px-1">Briefing Hub</h1>
            
            <div className="flex items-center gap-2 p-1 bg-gray-200 rounded-lg">
                <button className={`flex-1 ${tabButtonClass(activeTab === 'filters')}`} onClick={() => setActiveTab('filters')}>
                    <div className="flex justify-center items-center gap-2">
                        <span>🏷️</span>
                        <span>分类</span>
                    </div>
                </button>
                <button className={`flex-1 ${tabButtonClass(activeTab === 'calendar')}`} onClick={() => setActiveTab('calendar')}>
                    <div className="flex justify-center items-center gap-2">
                        <span>📅</span>
                        <span>日历</span>
                    </div>
                </button>
            </div>

            <div className="flex items-center justify-between gap-2">
                <div />
                <button
                    onClick={handleRefreshClick}
                    disabled={isRefreshing}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-md text-sm text-gray-700 hover:bg-gray-200 focus:outline-none"
                >
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
                    <span>{isRefreshing ? '正在更新' : '更新目录'}</span>
                </button>
            </div>

            <div className="flex-grow overflow-y-auto">
                {activeTab === 'filters' ? renderFiltersTab() : renderCalendarTab()}
            </div>
        </aside>
      );
};

export default Sidebar;