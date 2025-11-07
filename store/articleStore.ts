// src/store/articleStore.ts

import { create } from 'zustand';
import { Article, Filter, AvailableFilters, Tag } from '../types'; 



const getTodayInShanghai = (): string => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Shanghai'
  });
  return formatter.format(new Date());
};
const getCurrentTimeSlotInShanghai = (): 'morning' | 'afternoon' | 'evening' => {
  const now = new Date();
  const hour = parseInt(new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      hour12: false,
      timeZone: 'Asia/Shanghai'
  }).format(now), 10);

  if (hour < 12) return 'morning';
  if (hour < 19) return 'afternoon';
  return 'evening';
};



interface ArticleStoreState {
  articlesById: Record<string | number, Article>;
  starredArticleIds: (string | number)[]; // 【修改】从 Set 改为 Array
  activeFilter: Filter | null;
  timeSlot: 'morning' | 'afternoon' | 'evening' | null; // 【增】
  selectedArticleId: string | number | null;
  isReaderVisible: boolean;
  availableFilters: AvailableFilters;
  addArticles: (articles: Article[]) => void;
  updateArticle: (updatedArticle: Article) => void;
  setStarredArticleIds: (ids: (string | number)[]) => void;
  setActiveFilter: (filter: Filter | null) => void;
  setSelectedArticleId: (id: string | number | null) => void;
  openReader: () => void;
  closeReader: () => void;
  setAvailableFilters: (filters: AvailableFilters) => void;
  setTimeSlot: (slot: 'morning' | 'afternoon' | 'evening' | null) => void; // 【增】
}

const STAR_TAG = 'user/-/state/com.google/starred';
const isUserTag = (tagId: string) => !tagId.includes('/state/com.google/') && !tagId.includes('/state/org.freshrss/');

export const useArticleStore = create<ArticleStoreState>((set, get) => ({
  articlesById: {},
  starredArticleIds: [], // 初始为空数组
  activeFilter: null,
  timeSlot: null, // 【增】
  selectedArticleId: null,
  isReaderVisible: false,
  availableFilters: { categories: [], tags: [] },
  addArticles: (articles) => {
    if (!articles || articles.length === 0) return;
    set((state) => {
      const newArticlesById = { ...state.articlesById };
      articles.forEach(article => {
        newArticlesById[article.id] = { ...state.articlesById[article.id], ...article };
      });
      return { articlesById: newArticlesById };
    });
  },
  setTimeSlot: (slot) => set({ timeSlot: slot }), // 【增】
  updateArticle: (updatedArticle) => {
    const oldArticle = get().articlesById[updatedArticle.id];
    const wasStarred = get().articlesById[updatedArticle.id]?.tags?.includes(STAR_TAG);
    const isNowStarred = updatedArticle.tags?.includes(STAR_TAG);

    set((state) => {
      const newArticlesById = { ...state.articlesById, [updatedArticle.id]: updatedArticle };
      let newStarredArticleIds = [...state.starredArticleIds];
      if (isNowStarred && !wasStarred) {
        // 如果是新收藏的，添加到数组的最前面
        newStarredArticleIds = [updatedArticle.id, ...newStarredArticleIds];
      } else if (!isNowStarred && wasStarred) {
        // 如果是取消收藏，从数组中移除
        newStarredArticleIds = newStarredArticleIds.filter(id => id !== updatedArticle.id);
      }

       // --- 【核心逻辑】开始动态更新标签计数 ---
       const oldUserTags = new Set((oldArticle?.tags || []).filter(isUserTag));
       const newUserTags = new Set((updatedArticle.tags || []).filter(isUserTag));
 
       const tagsToAdd = [...newUserTags].filter(t => !oldUserTags.has(t));
       const tagsToRemove = [...oldUserTags].filter(t => !newUserTags.has(t));
       
       let newAvailableTags = [...state.availableFilters.tags];
 
       if (tagsToAdd.length > 0 || tagsToRemove.length > 0) {
         newAvailableTags = newAvailableTags.map(tag => {
           const newTag = { ...tag };
           if (tagsToAdd.includes(newTag.id)) {
             newTag.count = (newTag.count || 0) + 1;
           }
           if (tagsToRemove.includes(newTag.id)) {
             newTag.count = Math.max(0, (newTag.count || 0) - 1);
           }
           return newTag;
         });
       }
       // --- 结束动态更新标签计数 ---

      return {
        articlesById: newArticlesById,
        starredArticleIds: newStarredArticleIds,
        availableFilters: {
          ...state.availableFilters,
          tags: newAvailableTags,
        },
      };
    });
  },

  setStarredArticleIds: (ids) => {
    // 当从 API 获取完整的收藏列表时，直接设置
    set({ starredArticleIds: ids });
  },

  setActiveFilter: (filter) => {
    let newTimeSlot: 'morning' | 'afternoon' | 'evening' | null = null;
    
    // 在 action 内部计算正确的 timeSlot
    if (filter?.type === 'date') {
        const today = getTodayInShanghai();
        if (filter.value === today) {
            // 如果是今天，计算当前时间槽
            newTimeSlot = getCurrentTimeSlotInShanghai();
        } 
        // 对于历史日期，newTimeSlot 保持为 null (全天)
    }
    // 对于非日期过滤器，newTimeSlot 也保持为 null

    // 原子地更新 filter 和 timeSlot
    set({ 
      activeFilter: filter, 
      selectedArticleId: null, 
      timeSlot: newTimeSlot 
    });
  },

  setSelectedArticleId: (id) => set({ selectedArticleId: id }),
  openReader: () => set({ isReaderVisible: true }),
  closeReader: () => set({ isReaderVisible: false, selectedArticleId: null }),
  setAvailableFilters: (filters) => set({ availableFilters: filters }),
}));


export const selectSelectedArticle = (state: ArticleStoreState) => {
  if (!state.selectedArticleId) return null;
  return state.articlesById[state.selectedArticleId] || null;
};