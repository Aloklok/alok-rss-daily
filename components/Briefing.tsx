import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Article, BriefingReport, Tag, Filter } from '../types';
import { editArticleState, getTags, editArticleTag } from '../services/api';

const parseBold = (text: string, emphasisClass: string = 'font-semibold text-current') => {
  if (!text) return '';
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong
        key={i}
        className={emphasisClass}
        style={{
          fontFamily:
            "'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans SC', 'Source Han Sans SC', 'Helvetica Neue', Arial, sans-serif"
        }}
      >
        {part}
      </strong>
    ) : (
      part
    )
  );
};

const CALLOUT_THEMES = {
  '一句话总结': { icon: '📝', color: 'fuchsia' },
  '技术洞察': { icon: '🔬', color: 'teal' },
  '值得注意': { icon: '⚠️', color: 'amber' },
  '市场观察': { icon: '📈', color: 'sky' },
} as const;


const calloutCardClasses = {
    fuchsia: { bg: 'bg-fuchsia-400/30', title: 'text-fuchsia-950', body: 'text-fuchsia-900', emphasis: 'text-fuchsia-950 font-black bg-fuchsia-200/40 px-1.5 py-0.5 rounded-md' },
    teal: { bg: 'bg-teal-400/30', title: 'text-teal-950', body: 'text-teal-900', emphasis: 'text-teal-950 font-black bg-teal-200/40 px-1.5 py-0.5 rounded-md' },
    amber: { bg: 'bg-amber-400/30', title: 'text-amber-950', body: 'text-amber-900', emphasis: 'text-amber-950 font-black bg-amber-200/40 px-1.5 py-0.5 rounded-md' },
    sky: { bg: 'bg-sky-400/30', title: 'text-sky-950', body: 'text-sky-900', emphasis: 'text-sky-950 font-black bg-sky-200/40 px-1.5 py-0.5 rounded-md' },
};


const tagColorClasses = [
    'bg-sky-100 text-sky-800',
    'bg-emerald-100 text-emerald-800',
    'bg-violet-100 text-violet-800',
    'bg-rose-100 text-rose-800',
    'bg-amber-100 text-amber-800',
    'bg-cyan-100 text-cyan-800',
];

const getRandomColorClass = (key: string) => {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
        hash = key.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash % tagColorClasses.length);
    return tagColorClasses[index];
};


interface CalloutProps {
  title: keyof typeof CALLOUT_THEMES;
  content: string;
}

const Callout: React.FC<CalloutProps> = ({ title, content }) => {
    const theme = CALLOUT_THEMES[title];
    const colors = calloutCardClasses[theme.color];

    return (
        <aside className={`rounded-2xl p-5 backdrop-blur-lg ring-1 ring-white/30 ${colors.bg}`}>
            <div className="flex items-center gap-x-3 mb-3">
                <span className="text-2xl">{theme.icon}</span>
                <h4 className={`text-lg font-bold ${colors.title}`}>{title}</h4>
            </div>
            <div className={`${colors.body} text-[15px] leading-relaxed font-medium`}>
                {parseBold(content, colors.emphasis)}
            </div>
        </aside>
    );
};


interface TagPopoverProps {
    article: Article;
    availableTags: Tag[];
    onClose: () => void;
    onStateChange: (articleId: string | number, newTags: string[]) => Promise<void>;
}

const TagPopover: React.FC<TagPopoverProps> = ({ article, availableTags, onClose, onStateChange }) => {
    const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set(article.tags?.filter(t => !t.startsWith('user/-/state')) || []));
    const [isSaving, setIsSaving] = useState(false);
    
    const popoverRef = useRef<HTMLDivElement>(null);

    // 移除外部点击关闭的处理，改为只通过按钮关闭
    // useEffect(() => {
    //     const handleClickOutside = (event: MouseEvent) => {
    //         if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
    //             onClose();
    //         }
    //     };
    //     document.addEventListener('mousedown', handleClickOutside);
    //     return () => {
    //         document.removeEventListener('mousedown', handleClickOutside);
    //     };
    // }, [onClose]);

    const handleTagChange = (tagId: string) => {
        setSelectedTags(prev => {
            const newSet = new Set(prev);
            if (newSet.has(tagId)) {
                newSet.delete(tagId);
            } else {
                newSet.add(tagId);
            }
            return newSet;
        });
    };

    const handleConfirm = async () => {
        setIsSaving(true);
        const stateTags = article.tags?.filter(t => t.startsWith('user/-/state')) || [];
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
        <div 
            ref={popoverRef} 
            className="absolute bottom-full mb-2 w-64 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 right-0 md:left-1/2 md:-translate-x-1/2"
            onClick={(e) => e.stopPropagation()} // 阻止事件冒泡
        >
            <div className="p-4 border-b">
                <h4 className="font-semibold text-gray-800">编辑标签</h4>
            </div>
            {availableTags.length === 0 ? (
                <div className="p-4 text-center text-gray-500">暂无可用标签。</div>
            ) : (
                <div className="p-4 max-h-60 overflow-y-auto">
                    <div className="space-y-3">
                        {availableTags.map(tag => (
                            <label 
                                key={tag.id} 
                                className="flex items-center space-x-3 cursor-pointer"
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedTags.has(tag.id)}
                                    onChange={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleTagChange(tag.id);
                                    }}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span 
                                    className="text-gray-700"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleTagChange(tag.id);
                                    }}
                                >{tag.label}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}
            <div className="p-3 bg-gray-50 flex justify-end space-x-2 rounded-b-lg">
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }} 
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                    取消
                </button>
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        handleConfirm();
                    }}
                    disabled={isSaving}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:bg-blue-300"
                >
                    {isSaving ? '保存中...' : '确认'}
                </button>
            </div>
        </div>
    );
};

const SpinnerIcon = () => (
    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);


const IconCheckCircle = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
);

const IconCircle = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

interface ActionButtonsProps {
    article: Article;
    availableTags: Tag[];
    onReaderModeRequest: (article: Article) => void;
    onStateChange: (articleId: string | number, newTags: string[]) => Promise<void>;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({ article, availableTags, onReaderModeRequest, onStateChange }) => {
    const STAR_TAG = 'user/-/state/com.google/starred';
    const READ_TAG = 'user/-/state/com.google/read';

    const isStarred = article.tags?.includes(STAR_TAG) || false;
    const isRead = article.tags?.includes(READ_TAG) || false;
    const userTags = article.tags?.filter(tag => tag.startsWith('user/1000/label/')).map(tag => tag.split('/').pop()) || [];

    const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);
    const [isLoading, setIsLoading] = useState<'star' | 'read' | null>(null);

    const handleToggleState = async (action: 'star' | 'read') => {
        setIsLoading(action);
        const tag = action === 'star' ? STAR_TAG : READ_TAG;
        const currentTags = article.tags || [];
        const isActive = currentTags.includes(tag);
        
        const newTags = isActive
            ? currentTags.filter(t => t !== tag)
            : [...currentTags, tag];

        try {
            // The parent component `App.tsx` expects the full new array of tags.
            await onStateChange(article.id, newTags);
        } finally {
            setIsLoading(null);
        }
    };

    const actionButtonClass = "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 transform hover:scale-105 disabled:scale-100 disabled:cursor-wait disabled:opacity-75";
    const mobileActionButtonClass = "flex flex-col items-center justify-center h-16 w-16 text-xs font-medium rounded-full p-1 gap-1";

    return (
        <div className="relative mt-8">
            {/* Desktop Buttons */}
            <div className="hidden md:flex flex-col">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => onReaderModeRequest(article)} className={`${actionButtonClass} bg-blue-800 hover:bg-blue-900 text-white`}>
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            阅读
                        </button>
                        <button onClick={() => handleToggleState('star')} disabled={!!isLoading} className={`${actionButtonClass} ${isStarred ? 'bg-amber-400 text-amber-950' : 'bg-amber-200 hover:bg-amber-300 text-amber-900'}`}>
                             {isLoading === 'star' ? <SpinnerIcon /> : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>}
                             {isStarred ? '已收藏' : '收藏'}
                        </button>
                        <button 
                            onClick={() => handleToggleState('read')} 
                            disabled={!!isLoading} 
                            className={`${actionButtonClass} ${isRead 
                                ? 'bg-emerald-400 text-emerald-950 hover:bg-emerald-500' 
                                : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
                        >
                            {isLoading === 'read' ? <SpinnerIcon /> : (isRead ? <IconCheckCircle /> : <IconCircle />)}
                            {isRead ? '已读' : '标记已读'}
                        </button>
                         <div className="relative" onClick={(e) => e.stopPropagation()}>
                            <button 
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setIsTagPopoverOpen(prev => !prev);
                                }} 
                                className={`${actionButtonClass} bg-sky-200 hover:bg-sky-300 text-sky-900`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a1 1 0 011-1h5a.997.997 0 01.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                                标签
                            </button>
                            {isTagPopoverOpen && (
                                <div className="fixed inset-0 z-40" onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setIsTagPopoverOpen(false);
                                }}>
                                    <div className="absolute z-50 bottom-auto right-auto" 
                                        style={{
                                            top: '50%',
                                            left: '50%',
                                            transform: 'translate(-50%, -50%)'
                                        }}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                        }}>
                                        <TagPopover 
                                            article={article} 
                                            availableTags={availableTags} 
                                            onClose={() => setIsTagPopoverOpen(false)} 
                                            onStateChange={onStateChange} 
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                        {userTags.length > 0 && (
                            <div className="hidden md:flex flex-wrap gap-2 items-center">
                                <div className="border-l border-stone-300 h-6 mx-1"></div>
                                {userTags.map(tag => (
                                    tag && <span key={tag} className={`text-xs font-semibold inline-block py-1 px-2.5 rounded-full ${getRandomColorClass(tag)}`}>
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                     <a href={article.link} target="_blank" rel="noopener noreferrer" className={`${actionButtonClass} bg-stone-200 hover:bg-stone-300 text-stone-800`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" /><path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" /></svg>
                        原文
                    </a>
                </div>
            </div>

            {/* Mobile Buttons */}
            <div className="md:hidden">
                <div className="flex items-end justify-around">
                     <button onClick={() => onReaderModeRequest(article)} className={`${mobileActionButtonClass} text-white bg-blue-800`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>阅读</span>
                    </button>
                    <button onClick={() => handleToggleState('star')} disabled={!!isLoading} className={`${mobileActionButtonClass} ${isStarred ? 'bg-amber-300 text-amber-900' : 'bg-amber-100 text-amber-700'}`}>
                        {isLoading === 'star' ? <SpinnerIcon /> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>}
                        <span>{isStarred ? '已收藏' : '收藏'}</span>
                    </button>
                     <button 
                        onClick={() => handleToggleState('read')} 
                        disabled={!!isLoading} 
                        className={`${mobileActionButtonClass} ${isRead 
                            ? 'bg-emerald-400 text-emerald-950' 
                            : 'bg-gray-100 text-gray-700'}`}
                    >
                        {isLoading === 'read' ? <SpinnerIcon /> : (isRead ? <IconCheckCircle /> : <IconCircle />)}
                         <span>{isRead ? '已读' : '标记已读'}</span>
                    </button>
                     <button onClick={() => setIsTagPopoverOpen(prev => !prev)} className={`${mobileActionButtonClass} text-sky-700 bg-sky-100`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a1 1 0 011-1h5a.997.997 0 01.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                        <span>标签</span>
                    </button>
                    {isTagPopoverOpen && <TagPopover article={article} availableTags={availableTags} onClose={() => setIsTagPopoverOpen(false)} onStateChange={onStateChange} />}
                </div>
                <div className="flex justify-end mt-4">
                    <a href={article.link} target="_blank" rel="noopener noreferrer" className={`${mobileActionButtonClass} text-stone-600 bg-stone-100`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" /><path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" /></svg>
                        <span>原文</span>
                    </a>
                </div>
            </div>
        </div>
    );
};


interface ArticleCardProps {
  article: Article;
  availableTags: Tag[];
  onReaderModeRequest: (article: Article) => void;
  onStateChange: (articleId: string | number, newTags: string[]) => Promise<void>;
}

const ArticleCard: React.FC<ArticleCardProps> = ({ article, availableTags, onReaderModeRequest, onStateChange }) => {
  const publishedDate = new Date(article.published).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
  
  const allKeywords = [article.category, ...article.keywords];
  const isStarred = article.tags?.includes('user/-/state/com.google/starred') || false;

  return (
    <article className="py-12 transition-opacity duration-300">
      <header className="mb-8">
        <h3 className="text-3xl lg:text-4xl font-bold font-serif text-stone-900 mb-6 leading-tight flex items-center gap-x-3">
            {isStarred && <span className="text-amber-400 text-2xl" title="已收藏">⭐️</span>}
            <span>{article.title}</span>
        </h3>
        <div className="space-y-3">
             <div className="text-sm text-stone-400 flex items-center flex-wrap gap-x-4">
                <span>{article.sourceName}</span>
                <span>&bull;</span>
                <span>发布于 {publishedDate}</span>
             </div>
             <div className="text-sm text-stone-600 flex items-center flex-wrap">
                 <span className="font-medium mr-2">{article.verdict.type}</span>
                 <span className="mr-2">&bull;</span>
                 <span className="font-medium mr-2">{article.category}</span>
                 <span className="mr-2">&bull;</span>
                 <span className={`font-semibold ${article.verdict.score >= 8 ? 'text-green-600' : article.verdict.score >=6 ? 'text-amber-600' : 'text-red-600'}`}>
                     评分: {article.verdict.score}/10
                 </span>
            </div>
             {allKeywords && allKeywords.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                    {allKeywords.map(tag => (
                        <span key={tag} className={`text-xs font-semibold inline-block py-1 px-2.5 rounded-full transition-colors ${getRandomColorClass(tag)}`}>
                            {tag}
                        </span>
                    ))}
                </div>
            )}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <Callout title="一句话总结" content={article.summary} />
        <Callout title="技术洞察" content={article.highlights} />
        <Callout title="值得注意" content={article.critiques} />
        <Callout title="市场观察" content={article.marketTake} />
      </div>

      <ActionButtons article={article} availableTags={availableTags} onReaderModeRequest={onReaderModeRequest} onStateChange={onStateChange} />
    </article>
  );
};

interface ReportContentProps {
    report: BriefingReport;
    availableTags: Tag[];
    onReaderModeRequest: (article: Article) => void;
    onStateChange: (articleId: string | number, newTags: string[]) => Promise<void>;
}

const ReportContent: React.FC<ReportContentProps> = ({ report, availableTags, onReaderModeRequest, onStateChange }) => {
    const importanceOrder = ['重要新闻', '必知要闻', '常规更新'];
    const importanceStyles: { [key: string]: { emoji: string; bg: string; text: string; border: string } } = {
        '重要新闻': { emoji: '🚨', bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200' },
        '必知要闻': { emoji: '🔥', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
        '常规更新': { emoji: '📰', bg: 'bg-sky-50', text: 'text-sky-800', border: 'border-sky-200' },
    };

    const handleJump = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
        e.preventDefault();
        const element = document.getElementById(targetId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const DecorativeDivider = () => (
        <div className="flex items-center justify-center my-8">
            <span className="h-px w-20 bg-stone-200"></span>
            <span className="mx-4 text-stone-300 text-lg">◆</span>
            <span className="h-px w-20 bg-stone-200"></span>
        </div>
    );

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
            <div className="bg-white/70 backdrop-blur-md p-6 rounded-2xl border border-stone-200/80 shadow-sm mb-10">
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
                        const styles = importanceStyles[importance];

                        return (
                            <div key={importance}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 border-b-2 border-stone-200 my-2 pb-2">
                                    <div className="py-2">
                                        <a href={`#${sectionId}`} onClick={(e) => handleJump(e, sectionId)} className={`font-semibold text-base ${styles.text} hover:underline`}>
                                            <span className="mr-2">{styles.emoji}</span>
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

            {/* Articles Section */}
            <div className="">
                {importanceOrder.map(importance => {
                    const articles = report.articles[importance];
                    if (!articles || articles.length === 0) return null;

                    const sectionId = `importance-${importance.replace(/\s+/g, '-')}`;
                    const styles = importanceStyles[importance];

                    return (
                        <section key={importance} id={sectionId} className="scroll-mt-20">
                            <h2 className={`flex items-center gap-x-3 text-3xl font-bold font-serif p-4 rounded-lg ${styles.bg} ${styles.text} border-l-4 ${styles.border}`}>
                                <span>{styles.emoji}</span>
                                {importance}
                            </h2>
                            <div className="mt-0">
                                {articles.map((article, index) => (
                                    <div key={article.id} id={`article-${article.id}`} className="scroll-mt-24">
                                        <ArticleCard article={article} availableTags={availableTags} onReaderModeRequest={onReaderModeRequest} onStateChange={onStateChange} />
                                        {index < articles.length - 1 && <DecorativeDivider />}
                                    </div>
                                ))}
                            </div>
                        </section>
                    );
                })}
            </div>
        </div>
    );
};


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
}

const GRADIENTS = [
    'from-rose-400 via-fuchsia-500 to-indigo-500',
    'from-green-400 via-cyan-500 to-blue-500',
    'from-amber-400 via-orange-500 to-red-500',
    'from-teal-400 via-sky-500 to-purple-500',
    'from-lime-400 via-emerald-500 to-cyan-500'
];

const Briefing: React.FC<BriefingProps> = ({ reports, activeFilter, timeSlot, selectedReportId, availableTags, onReportSelect, onReaderModeRequest, onStateChange, onResetFilter, onTimeSlotChange }) => {
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
      if (hour < 12) return '早上好';
      if (hour < 18) return '中午好';
      return '晚上好';
  }

  const renderHeader = () => {
      if (activeFilter?.type === 'date') {
          const dateObj = new Date(activeFilter.value + 'T00:00:00');
          const datePart = dateObj.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
          const weekdayPart = dateObj.toLocaleDateString('zh-CN', { weekday: 'long' });

          return (
             <header className={`mb-12 bg-gradient-to-br ${randomGradient} rounded-2xl p-8 text-white shadow-lg`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex-grow">
                        <div className="mb-4">
                             <h1 className="text-5xl font-serif font-bold leading-none tracking-tight">
                                {isToday ? '今天' : datePart}
                            </h1>
                             <div className="mt-3 inline-block bg-white/20 backdrop-blur-sm text-white/90 px-4 py-1.5 rounded-full text-lg font-medium">
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
                            <p className="mt-6 text-2xl md:text-3xl font-serif font-bold tracking-tight text-white/95">
                                {getGreeting()}，欢迎阅读今日简报。
                            </p>
                        )}
                    </div>
                    {activeFilter?.type === 'date' && (
                         <div className="mt-6 md:mt-0 flex-shrink-0 flex items-center gap-2">
                            <div className="bg-black/10 p-1.5 rounded-full flex gap-1">
                                {(['morning','afternoon','evening'] as const).map(slot => {
                                    const labelMap: Record<'morning'|'afternoon'|'evening', string> = { morning: '早上', afternoon: '下午', evening: '晚上' };
                                    const isSelected = timeSlot === slot;
                                    return (
                                        <button
                                            key={slot}
                                            onClick={() => onTimeSlotChange(isSelected ? null : slot)}
                                            className={`px-4 sm:px-5 py-2 text-base font-semibold rounded-full transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-white/50 ${
                                                isSelected ? 'bg-white text-blue-600 shadow-md' : 'text-white/80 hover:bg-white/10'
                                            }`}
                                        >
                                            {labelMap[slot]}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {activeFilter?.type !== 'date' && reports.length > 0 && (
                         <nav className="mt-6 md:mt-0 flex-shrink-0 bg-black/10 p-1.5 rounded-full flex gap-1">
                            {reports.map(report => {
                                const isSelected = report.id === selectedReportId;
                                return (
                                    <button
                                        key={report.id}
                                        onClick={() => onReportSelect(report.id)}
                                        className={`px-4 sm:px-5 py-2 text-base font-semibold rounded-full transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-white/50 ${
                                            isSelected
                                                ? 'bg-white text-blue-600 shadow-md'
                                                : 'text-white/80 hover:bg-white/10'
                                        }`}
                                    >
                                        {report.title.replace('简报','')}
                                    </button>
                                );
                            })}
                        </nav>
                    )}
                </div>
            </header>
          );
      } else if (activeFilter) {
            const titleMap: Record<Filter['type'], string> = { 
                category: '分类', 
                tag: '标签',
                starred: '⭐ 我的收藏',
                date: ''
            };
          return (
              <header className="mb-12 p-8 border-b border-gray-200">
                  <div className="flex items-center text-xl font-semibold text-gray-500">
                      <button onClick={onResetFilter} className="flex items-center gap-2 hover:text-blue-600 transition-colors">
                          <span className="text-2xl">🏠</span>
                          <span>首页</span>
                      </button>
                      <span className="mx-3 text-gray-300">/</span>
                      <div className="text-gray-800">
                          {titleMap[activeFilter.type]}: 
                          <span className="ml-2 font-bold text-blue-600">
                              {activeFilter.type !== 'starred' ? activeFilter.value : ''}
                          </span>
                      </div>
                  </div>
              </header>
          );
      }
      return null;
  }

  return (
    <main className="flex-1 p-6 md:p-8 lg:p-10">
      <div className="max-w-6xl mx-auto">
        {renderHeader()}
        
        {reports.length > 0 ? (
            <>
                {selectedReport ? (
                    <ReportContent 
                        report={selectedReport} 
                        availableTags={availableTags}
                        onReaderModeRequest={onReaderModeRequest}
                        onStateChange={onStateChange}
                    />
                ) : (
                    <div className="text-center py-20">
                        <p className="text-stone-500">请选择一份简报进行查看。</p>
                    </div>
                )}
            </>
        ) : (
          <div className="text-center py-20">
            <p className="text-2xl font-semibold text-stone-600">
                {isToday 
                    ? '今天暂无简报，请稍后查看。'
                    : '该日期或分类下没有简报。'
                }
            </p>
          </div>
        )}
      </div>
    </main>
  );
};

export default Briefing;
