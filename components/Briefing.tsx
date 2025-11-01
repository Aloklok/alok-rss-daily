import React, { useMemo } from 'react';
import { Article, BriefingReport, Tag, Filter } from '../types';
import ArticleGroup from './ArticleGroup'; // Import the new component

// The ReportContent component is now much simpler.
interface ReportContentProps {
    report: BriefingReport;
    availableTags: Tag[];
    onReaderModeRequest: (article: Article) => void;
    onStateChange: (articleId: string | number, newTags: string[]) => Promise<void>;
}

const ReportContent: React.FC<ReportContentProps> = ({ report, availableTags, onReaderModeRequest, onStateChange }) => {
    const importanceOrder = ['重要新闻', '必知要闻', '常规更新'];

    const handleJump = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
        e.preventDefault();
        const element = document.getElementById(targetId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const allArticlesCount = Object.values(report.articles).reduce((acc, articles) => acc + articles.length, 0);

    if (allArticlesCount === 0) {
        return (
            <div className="text-center py-20">
                <p className="text-2xl font-semibold text-stone-600">此时间段内暂无文章。</p>
            </div>
        );
    }

    return (
        <div>
            {/* Table of Contents & Summary Section */}
            <div className="bg-white/70 backdrop-blur-md px-2 py-2 rounded-2xl border border-stone-200/80 shadow-sm mb-10">
                <div className="md:hidden">
                    <h3 className="text-2xl font-bold font-serif text-stone-800 flex items-center">
                        <span>📚 目录</span>
                        <span className="text-stone-400 mx-2 font-light">/</span>
                        <span>📝 摘要</span>
                    </h3>
                </div>
                <div className="hidden md:grid grid-cols-2 gap-x-6">
                    <h3 className="text-2xl font-bold font-serif text-stone-800">📚 目录</h3>
                    <h3 className="text-2xl font-bold font-serif text-stone-800">📝 摘要</h3>
                </div>

                <div className="mt-3">
                    {importanceOrder.map(importance => {
                        const articles = report.articles[importance];
                        if (!articles || articles.length === 0) return null;
                        const sectionId = `importance-${importance.replace(/\s+/g, '-')}`;
                        return (
                            <div key={importance}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 border-b-2 border-stone-200 my-2 pb-2">
                                    <div className="py-2">
                                        <a href={`#${sectionId}`} onClick={(e) => handleJump(e, sectionId)} className="font-semibold text-base text-rose-800 hover:underline">
                                            <span className="mr-2"></span>
                                            {importance}
                                        </a>
                                    </div>
                                    <div className="hidden md:block py-2"></div>
                                </div>
                                {articles.map(article => (
                                    <div key={article.id}>
                                        <div className="md:hidden py-3">
                                            <a href={`#article-${article.id}`} onClick={(e) => handleJump(e, `article-${article.id}`)} className="text-sky-600 hover:text-sky-800 font-medium leading-tight">
                                                {article.title}
                                            </a>
                                            <p className="mt-2 text-base text-stone-600 leading-relaxed">{article.tldr}</p>
                                        </div>
                                        <div className="hidden md:grid grid-cols-2 gap-x-6">
                                            <div className="py-2 flex items-start">
                                                <a href={`#article-${article.id}`} onClick={(e) => handleJump(e, `article-${article.id}`)} className="text-sky-600 hover:text-sky-800 hover:underline font-medium leading-tight decoration-sky-300 decoration-2">
                                                    {article.title}
                                                </a>
                                            </div>
                                            <div className="py-2 text-base text-stone-600 leading-relaxed flex items-start">{article.tldr}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Articles Section - Now uses ArticleGroup */}
            <div className="">
                {importanceOrder.map(importance => (
                    <ArticleGroup
                        key={importance}
                        importance={importance}
                        articles={report.articles[importance]}
                        availableTags={availableTags}
                        onReaderModeRequest={onReaderModeRequest}
                        onStateChange={onStateChange}
                    />
                ))}
            </div>
        </div>
    );
};

// The main Briefing component remains largely the same.
interface BriefingProps {
  reports: BriefingReport[];
  activeFilter: Filter | null;
  timeSlot: 'morning' | 'afternoon' | 'evening' | null;
  selectedReportId: number | null;
  availableTags: Tag[];
  onReportSelect: (id: number) => void;
  onReaderModeRequest: (article: Article) => void;
  onStateChange: (articleId: string | number, newTags: string[]) => Promise<void>;
  onResetFilter: () => void;
  onTimeSlotChange: (slot: 'morning' | 'afternoon' | 'evening' | null) => void;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

const GRADIENTS = [
    'from-rose-400 via-fuchsia-500 to-indigo-500', 'from-green-400 via-cyan-500 to-blue-500',
    'from-amber-400 via-orange-500 to-red-500', 'from-teal-400 via-sky-500 to-purple-500',
    'from-lime-400 via-emerald-500 to-cyan-500'
];

const Briefing: React.FC<BriefingProps> = ({ reports, activeFilter, timeSlot, selectedReportId, availableTags, onReportSelect, onReaderModeRequest, onStateChange, onResetFilter, onTimeSlotChange, isSidebarCollapsed, onToggleSidebar }) => {
  const selectedReport = reports.find(r => r.id === selectedReportId);

  const randomGradient = useMemo(() => {
    if(activeFilter?.type !== 'date') return GRADIENTS[0];
    const dateAsNumber = new Date(activeFilter.value + 'T00:00:00').getDate();
    return GRADIENTS[dateAsNumber % GRADIENTS.length];
  }, [activeFilter]);
  
  const isToday = useMemo(() => {
    if (activeFilter?.type !== 'date') return false;
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const todayLocal = `${y}-${m}-${d}`;
    return activeFilter.value === todayLocal;
  }, [activeFilter]);

  const getGreeting = () => {
      const hour = new Date().getHours();
      if (hour >= 0 && hour < 5) return '凌晨好';
      if (hour >= 5 && hour < 12) return '早上好';
      if (hour >= 12 && hour < 14) return '中午好';
      if (hour >= 14 && hour < 18) return '下午好';
      if (hour >= 18 && hour < 22) return '傍晚好';
      return '晚上好';
  }

  const renderHeader = () => {
      if (activeFilter?.type === 'date') {
          const dateObj = new Date(activeFilter.value + 'T00:00:00');
          const datePart = dateObj.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
          const weekdayPart = dateObj.toLocaleDateString('zh-CN', { weekday: 'long' });

          const now = new Date();
          const currentHour = now.getHours();

          const getCurrentTimeSlot = () => {
              if (currentHour >= 0 && currentHour < 12) return 'morning';
              if (currentHour >= 12 && currentHour < 19) return 'afternoon';
              return 'evening';
          };
          const autoSelectedSlot = isToday ? getCurrentTimeSlot() : null;

          return (
             <header className={`relative mb-6 md:mb-12 bg-gradient-to-br ${randomGradient} rounded-2xl p-4 md:p-8 text-white shadow-lg`}>
                
                <button
                    onClick={onToggleSidebar}
                    className="md:hidden absolute top-4 right-4 p-2 bg-white/20 rounded-full z-10"
                >
                    {isSidebarCollapsed ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="3" y="4" width="18" height="16" rx="2" strokeWidth="2" /><path d="M9 4v16" strokeWidth="2" /></svg>
                    )}
                </button>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex-grow">
                        <div className="mb-4">
                             <h1 className="text-4xl md:text-5xl font-serif font-bold leading-none tracking-tight">
                                {isToday ? '今天' : datePart}
                            </h1>
                             <div className="mt-2 md:mt-3 inline-block bg-white/20 backdrop-blur-sm text-white/90 px-3 py-1 rounded-full text-base md:text-lg font-medium">
                                {isToday ? (
                                    <>
                                        <span>{datePart}</span>
                                        <span className="mx-2 opacity-60">·</span>
                                        <span>{weekdayPart}</span>
                                    </>
                                ) : (
                                    <span>{weekdayPart}</span>
                                )}
                            </div>
                        </div>
                        {isToday && (
                            <p className="mt-4 md:mt-6 text-lg md:text-xl font-serif font-bold tracking-tight text-white/95">
                                {getGreeting()}，欢迎阅读今日简报。
                            </p>
                        )}
                    </div>
                    {activeFilter?.type === 'date' && (
                         <div className="mt-2 md:mt-0 flex-shrink-0 flex items-center gap-2">
                            <div className="bg-black/10 p-1.5 rounded-full flex gap-1">
                                {(['morning','afternoon','evening'] as const).map(slotOption => {
                                    const labelMap: Record<'morning'|'afternoon'|'evening', string> = { morning: '早上', afternoon: '中午', evening: '晚上' };
                                    const isSelected = timeSlot === slotOption || (timeSlot === null && autoSelectedSlot === slotOption);
                                    return (
                                        <button
                                            key={slotOption}
                                            onClick={() => onTimeSlotChange(isSelected ? null : slotOption)}
                                            className={`px-3 py-1.5 md:px-4 md:py-2 text-sm md:text-base font-semibold rounded-full transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-white/50 ${
                                                isSelected ? 'bg-white text-blue-600 shadow-md' : 'text-white/80 hover:bg-white/10'
                                            }`}
                                        >
                                            {labelMap[slotOption]}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </header>
          );
      }
      return null;
  }

  return (
    <main className="flex-1 px-2 py-2 md:p-8 lg:p-10">
      <div className="max-w-6xl mx-auto">
        {renderHeader()}
        
        {selectedReport ? (
            <ReportContent 
                report={selectedReport} 
                availableTags={availableTags}
                onReaderModeRequest={onReaderModeRequest}
                onStateChange={onStateChange}
            />
        ) : (
          <div className="text-center py-20">
            <p className="text-2xl font-semibold text-stone-600">
                {isToday 
                    ? '暂无简报，请稍后查看。'
                    : '该日期下没有简报。'
                }
            </p>
          </div>
        )}
      </div>
    </main>
  );
};

export default Briefing;