// src/store/articleStore.ts

import { create } from 'zustand';
import { Article } from '../types';

interface ArticleStoreState {
  articlesById: Record<string | number, Article>;
  starredArticleIds: (string | number)[]; // 【修改】从 Set 改为 Array
  
  addArticles: (articles: Article[]) => void;
  updateArticle: (updatedArticle: Article) => void;
  setStarredArticleIds: (ids: (string | number)[]) => void;
}

const STAR_TAG = 'user/-/state/com.google/starred';

export const useArticleStore = create<ArticleStoreState>((set, get) => ({
  articlesById: {},
  starredArticleIds: [], // 初始为空数组

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

  updateArticle: (updatedArticle) => {
    const wasStarred = get().articlesById[updatedArticle.id]?.tags?.includes(STAR_TAG);
    const isNowStarred = updatedArticle.tags?.includes(STAR_TAG);

    set((state) => {
      const newArticlesById = { ...state.articlesById, [updatedArticle.id]: updatedArticle };
      let newStarredArticleIds = [...state.starredArticleIds];

      // 【核心修复】修改数组的逻辑
      if (isNowStarred && !wasStarred) {
        // 如果是新收藏的，添加到数组的最前面
        newStarredArticleIds = [updatedArticle.id, ...newStarredArticleIds];
      } else if (!isNowStarred && wasStarred) {
        // 如果是取消收藏，从数组中移除
        newStarredArticleIds = newStarredArticleIds.filter(id => id !== updatedArticle.id);
      }

      return {
        articlesById: newArticlesById,
        starredArticleIds: newStarredArticleIds,
      };
    });
  },

  setStarredArticleIds: (ids) => {
    // 当从 API 获取完整的收藏列表时，直接设置
    set({ starredArticleIds: ids });
  },
}));