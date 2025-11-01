import React, { useState, useRef, useMemo } from 'react';
import { Article, Tag } from '../types';

// Helper functions and constants previously in Briefing.tsx

const parseBold = (text: string, emphasisClass: string = 'font-semibold text-current') => {
    if (!text) return '';
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, i) =>
        i % 2 === 1 ? (
            <strong key={i} className={emphasisClass} style={{ fontFamily: "'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans SC', 'Source Han Sans SC', 'Helvetica Neue', Arial, sans-serif" }}>
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
    'bg-sky-100 text-sky-800', 'bg-emerald-100 text-emerald-800', 'bg-violet-100 text-violet-800',
    'bg-rose-100 text-rose-800', 'bg-amber-100 text-amber-800', 'bg-cyan-100 text-cyan-800',
];

const getRandomColorClass = (key: string) => {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
        hash = key.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash % tagColorClasses.length);
    return tagColorClasses[index];
};

// --- Child Components for ArticleCard ---

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

const SpinnerIcon = () => ( <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> );
const IconCheckCircle = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg> );
const IconCircle = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> );

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
    const userTags = useMemo(() => {
        return article.tags?.filter(tag => /^user\/(\d+|-)\/label\//.test(tag)).map(tag => decodeURIComponent(tag.split('/').pop() || '')) || [];
    }, [article.tags]);
    const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);
    const [isLoading, setIsLoading] = useState<'star' | 'read' | null>(null);

    const handleToggleState = async (action: 'star' | 'read') => {
        setIsLoading(action);
        const tag = action === 'star' ? STAR_TAG : READ_TAG;
        const currentTags = article.tags || [];
        const isActive = currentTags.includes(tag);
        const newTags = isActive ? currentTags.filter(t => t !== tag) : [...currentTags, tag];
        try {
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
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            阅读
                        </button>
                        <button onClick={() => handleToggleState('star')} disabled={!!isLoading} className={`${actionButtonClass} ${isStarred ? 'bg-amber-400 text-amber-950' : 'bg-amber-200 hover:bg-amber-300 text-amber-900'}`}>
                            {isLoading === 'star' ? <SpinnerIcon /> : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>}
                            {isStarred ? '已收藏' : '收藏'}
                        </button>
                        <button onClick={() => handleToggleState('read')} disabled={!!isLoading} className={`${actionButtonClass} ${isRead ? 'bg-emerald-400 text-emerald-950 hover:bg-emerald-500' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}>
                            {isLoading === 'read' ? <SpinnerIcon /> : (isRead ? <IconCheckCircle /> : <IconCircle />)}
                            {isRead ? '已读' : '标记已读'}
                        </button>
                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => setIsTagPopoverOpen(prev => !prev)} className={`${actionButtonClass} bg-sky-200 hover:bg-sky-300 text-sky-900`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a1 1 0 011-1h5a.997.997 0 01.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                                标签
                            </button>
                            {isTagPopoverOpen && <TagPopover article={article} availableTags={availableTags} onClose={() => setIsTagPopoverOpen(false)} onStateChange={onStateChange} />}
                        </div>
                        {userTags.length > 0 && (
                            <div className="hidden md:flex flex-wrap gap-2 items-center">
                                <div className="border-l border-stone-300 h-6 mx-1"></div>
                                {userTags.map(tag => (tag && <span key={tag} className={`text-xs font-semibold inline-block py-1 px-2.5 rounded-full ${getRandomColorClass(tag)}`}>{tag}</span>))}
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
            <div className="md:hidden mt-8">
                <div className="flex justify-around items-center">
                    <button onClick={() => onReaderModeRequest(article)} className={`${mobileActionButtonClass} text-blue-600`}>
                        <svg xmlns="http://www.w.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        <span className="text-xs sr-only">阅读</span>
                    </button>
                    <button onClick={() => handleToggleState('star')} disabled={!!isLoading} className={`${mobileActionButtonClass} ${isStarred ? 'text-amber-500' : 'text-gray-600'}`}>
                        {isLoading === 'star' ? <SpinnerIcon /> : <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>}
                        <span className="text-xs sr-only">{isStarred ? '已收藏' : '收藏'}</span>
                    </button>
                    <button onClick={() => handleToggleState('read')} disabled={!!isLoading} className={`${mobileActionButtonClass} ${isRead ? 'text-emerald-600' : 'text-gray-600'}`}>
                        {isLoading === 'read' ? <SpinnerIcon /> : (isRead ? <IconCheckCircle /> : <IconCircle />)}
                        <span className="text-xs sr-only">{isRead ? '已读' : '标记已读'}</span>
                    </button>
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setIsTagPopoverOpen(prev => !prev)} className={`${mobileActionButtonClass} text-sky-600`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a1 1 0 011-1h5a.997.997 0 01.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                            <span className="text-xs sr-only">标签</span>
                        </button>
                        {isTagPopoverOpen && <TagPopover article={article} availableTags={availableTags} onClose={() => setIsTagPopoverOpen(false)} onStateChange={onStateChange} />}
                    </div>
                    <a href={article.link} target="_blank" rel="noopener noreferrer" className={`${mobileActionButtonClass} text-gray-600`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor"><path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" /><path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" /></svg>
                        <span className="text-xs sr-only">原文</span>
                    </a>
                </div>
                {userTags.length > 0 && (
                    <div className="flex flex-wrap gap-2 items-center justify-center mt-2 pt-2 border-t border-gray-200">
                        {userTags.map(tag => (tag && <span key={tag} className={`text-xs font-semibold inline-block py-1 px-2 rounded-full ${getRandomColorClass(tag)}`}>{tag}</span>))}
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Main Exported Component ---

interface ArticleCardProps {
    article: Article;
    availableTags: Tag[];
    onReaderModeRequest: (article: Article) => void;
    onStateChange: (articleId: string | number, newTags: string[]) => Promise<void>;
}

const ArticleCard: React.FC<ArticleCardProps> = ({ article, availableTags, onReaderModeRequest, onStateChange }) => {
    const publishedDate = new Date(article.published).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
    const allKeywords = [...article.keywords];
    const isStarred = article.tags?.includes('user/-/state/com.google/starred') || false;

    return (
        <article className="py-2 transition-opacity duration-300">
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
                        <span className={`font-semibold ${article.verdict.score >= 8 ? 'text-green-600' : article.verdict.score >= 6 ? 'text-amber-600' : 'text-red-600'}`}>
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

export default ArticleCard;
