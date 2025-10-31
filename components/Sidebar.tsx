import React from 'react';
import { Article, Filter, AvailableFilters } from '../types';
import { useSidebar, ActiveTab } from '../hooks/useSidebar'; // Import the new hook

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

const formatMonthForDisplay = (month: string) => {
    if (!month) return '';
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleString('zh-CN', { year: 'numeric', month: 'long' });
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
    datesForMonth, // Add datesForMonth here
}) => {
    const {
        activeTab,
        setActiveTab,
        starredExpanded,
        toggleStarred,
        starredArticles,
        isLoadingStarred,
        refreshStarred,
    } = useSidebar();

    const isFilterActive = (type: Filter['type'], value: string) => {
        return activeFilter?.type === type && activeFilter?.value === value;
    };

    const handleRefreshClick = async () => {
        if (onRefresh) {
            await onRefresh();
        }
        // Also refresh starred articles if the panel is open
        if (starredExpanded) {
            await refreshStarred();
        }
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

    const renderFiltersTab = () => (
        <div className="space-y-4">
             <nav className="flex flex-col gap-1.5">
                <div>
                    <button onClick={toggleStarred} className={listItemButtonClass(isFilterActive('starred', 'true'))}>
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
                                            onClick={() => onOpenArticle ? onOpenArticle(article) : onFilterChange({ type: 'starred', value: 'true' })}
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
                {datesForMonth.map(date => {
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
        <aside className="flex flex-col flex-shrink-0 bg-gray-50 border-r border-gray-200 w-full md:w-80 p-4 space-y-4 relative">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900 px-1">Briefing Hub</h1>
                <button onClick={handleRefreshClick} disabled={isLoading} className="p-2 rounded-full hover:bg-gray-200 transition-colors">
                    <svg className={`h-5 w-5 text-gray-600 ${isLoading ? 'animate-spin' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582A7.962 7.962 0 0112 4.062a8.002 8.002 0 018 8.002 8.002 8.002 0 01-8 8.002A7.962 7.962 0 014.582 15H4v5" />
                    </svg>
                </button>
            </div>
            
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

            <div className="flex-grow overflow-y-auto">
                {activeTab === 'filters' ? renderFiltersTab() : renderCalendarTab()}
            </div>
        </aside>
      );
};

export default Sidebar;
