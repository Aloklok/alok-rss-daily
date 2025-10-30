export interface Verdict {
  type: string;
  score: number;
  importance?: string;
}

export interface Tag {
  id: string;
  label: string;
}

export interface Article {
  id: string | number;
  created_at: string;
  title: string;
  link: string;
  sourceName: string;
  published: string;
  crawlTime?: string; // time when the crawler fetched the article
  category: string;
  briefingSection: string;
  keywords: string[];
  verdict: Verdict;
  summary?: string;
  tldr: string;
  highlights: string; // Technical Insight
  critiques: string; // Worth Noting
  marketTake: string; // Market Observation
  tags?: string[];
}

export type GroupedArticles = {
  [importance: string]: Article[];
};

export interface BriefingReport {
  id: number;
  title: string;
  articles: GroupedArticles;
}

export interface CleanArticleContent {
  title: string;
  content: string; // Sanitized HTML
  source: string;
}

export interface AvailableFilters {
  categories: string[];
  tags: string[];
}

export type Filter = {
  type: 'date' | 'category' | 'tag' | 'starred';
  value: string;
}