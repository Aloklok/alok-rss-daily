import { Article, BriefingReport, Tag, CleanArticleContent, AvailableFilters, Filter } from '../types';

// --- Mock Data Store ---
let MOCK_TAGS: Tag[] = [
    { id: 'user/1000/label/framework', label: 'Framework' },
    { id: 'user/1000/label/ai', label: 'AI' },
    { id: 'user/1000/label/performance', label: 'Performance' },
];

let MOCK_ARTICLES: Article[] = [
    {
        id: "7aa5a623-2b98-4ca2-a619-79660b110cdf",
        created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        title: "Uno Platform 6.3新增.NET 10预览版支持，并为VS 2026做好准备",
        link: "https://www.infoq.cn/article/Kql1zUw4dkmOsgWVBrhL",
        sourceName: "InfoQ - 后端",
        published: new Date().toISOString(), // Today
        category: "前端开发",
        briefingSection: "技术前沿",
        keywords: ["Uno Platform", ".NET 10", "Visual Studio 2026", "WebAssembly", "跨平台UI"],
        verdict: {type: "新闻事件型", score: 6, importance: "常规更新"},
        summary: "这是一次典型的**生态卡位战**，团队需要关注它是否会影响现有项目的升级路径和工具链稳定性。",
        highlights: "支持 **.NET 10 RC1** 是前瞻性布局，让开发者可以提前适配和测试，抢占未来技术栈的话语权。这一点对于需要长周期维护的企业级项目来说尤其重要。",
        critiques: "所谓的Hot Design编辑器增强，只是在Visual Studio Live Property Explorer里加了个可搜索树，这种程度的更新就当成一个亮点来宣传，未免有点**夸大其词**。",
        marketTake: "在国内，除了特定圈子（比如医疗、工业控制），还在坚持用XAML搞跨平台的开发者已经快成**稀有物种**了。大部分中小团队早就转向Web技术栈或者Flutter/React Native。",
        tldr: "Uno Platform 6.3支持.NET 10预览版和VS 2026新项目格式，增强了设计器功能。",
        tags: ['user/1000/label/framework']
    },
    {
        id: "a1b2c3d4-e5f6-7890-1234-567890abcdef",
        created_at: new Date().toISOString(),
        title: 'LangChain彻底重写：从开源副业到独角兽，大模型框架的演进与未来',
        link: 'https://www.infoq.cn/article/OSEpqr1rIQdRoU6uaFhV',
        sourceName: 'InfoQ - AI＆大模型',
        published: new Date().toISOString(), // Today
        category: 'AI与前沿科技',
        briefingSection: '深度观察',
        keywords: ['LangChain', 'LLM框架', 'AI开发', '开源'],
        verdict: { type: '知识洞察型', score: 9, importance: '高度重要' },
        tldr: 'LangChain 1.0 基于 LangGraph 重写，从链式（Chain）结构演变为图（Graph）结构，增强了复杂AI应用的构建能力，并正式发布了LangSmith用于调试和监控。',
        summary: '这篇文章详细拆解了LangChain从0.1到1.0版本的**核心架构演进**，解释了为什么从`Chain`到`Graph`是必然趋势，以及这背后反映的LLM应用开发的模式变迁。',
        highlights: '最大的技术亮点是引入 **LangGraph**，它允许开发者以图形方式定义Agent的行为流，从而可以创建**有循环、有状态、更可控**的复杂应用，解决了传统链式结构线性、难以调试的问题。',
        critiques: 'LangChain早期版本为了追求快速迭代和功能覆盖，API**变动频繁、文档滞后**，导致开发者学习成本很高，社区怨声载道。1.0版本虽然稳定了，但历史包袱依然存在。',
        marketTake: 'LangChain以12.5亿美元的估值成为独角兽，证明了**“卖铲子”**在AI淘金热中的巨大商业价值。但同时，它也面临来自LlamaIndex、Microsoft Semantic Kernel等框架的激烈竞争。',
        tags: ['user/-/state/com.google/starred', 'user/1000/label/ai'],
    },
    {
        id: "fedcba98-7654-3210-fedc-ba9876543210",
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        title: 'React 19 RC发布：告别Memo，编译器驱动的革命',
        link: 'https://react.dev/blog/2024/04/25/react-19',
        sourceName: 'React Official Blog',
        published: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
        category: '前端开发',
        briefingSection: '技术前沿',
        keywords: ['React 19', 'React Compiler', 'Memoization', 'Frontend'],
        verdict: { type: '重大更新型', score: 10, importance: '变革性' },
        tldr: 'React 19 RC发布，核心是引入了React Compiler，能自动进行性能优化，开发者不再需要手动使用`memo`、`useCallback`和`useMemo`。',
        summary: 'React 19的核心变革是**React Compiler**，它将React从一个纯运行时库转变为一个**编译时和运行时结合**的框架，旨在从根本上解决手动性能优化带来的心智负担和代码冗余。',
        highlights: 'React Compiler是一个**深度优化的编译器**，它能理解React的规则，自动重写代码，实现精细化的状态变更和UI更新，性能远超手动`memo`。同时，Actions功能简化了异步操作和状态管理。',
        critiques: '编译器目前仍是**黑盒**，对于复杂的或不符合其预期的代码模式，可能会产生难以调试的bug。开发者需要时间来建立对编译器的信任和理解其工作原理。',
        marketTake: '这是React应对Svelte、SolidJS等新兴编译型框架的**有力回击**。通过将优化工作交给编译器，React在保持其庞大生态和声明式API优势的同时，大幅提升了开发体验和应用性能。',
        tags: ['user/-/state/com.google/starred', 'user/1000/label/framework', 'user/1000/label/performance']
    },
    {
        id: "12345678-1234-1234-1234-1234567890ab",
        created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        title: 'WebAssembly崛起：JavaScript之外的另一种选择',
        link: 'https://example.com/wasm-rise',
        sourceName: 'WebDev Weekly',
        published: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // Two days ago
        category: '后端开发',
        briefingSection: '深度观察',
        keywords: ['WebAssembly', 'WASM', 'Performance', 'Rust'],
        verdict: { type: '趋势分析型', score: 8, importance: '值得关注' },
        tldr: 'WebAssembly (WASM) 正从浏览器走向服务器端，凭借其高性能、安全和语言无关的特性，成为构建微服务、边缘计算和插件系统的热门技术。',
        summary: '文章探讨了WebAssembly从最初作为浏览器高性能计算沙箱，到如今**“一次编译，随处运行”**的全场景应用潜力，尤其是在服务器端和边缘计算领域的应用案例。',
        highlights: 'WASI（WebAssembly System Interface）的标准化是关键，它为WASM提供了访问底层系统资源（如文件系统、网络）的能力，使其**摆脱了对浏览器的依赖**，成为真正的通用运行时。',
        critiques: 'WASM的**生态系统仍不成熟**，尤其是在工具链、调试和成熟的库方面，与Node.js等成熟平台相比还有很大差距。同时，与JavaScript的互操作性（FFI）开销也是一个需要考虑的问题。',
        marketTake: 'Docker的联合创始人所说的“如果WASM在2008年就存在，我们就不需要创建Docker了”，这句话**精准地概括了WASM的颠覆性潜力**。它正在成为云原生领域一个轻量级、更安全的容器替代方案。',
        tags: ['user/1000/label/performance']
    }
];

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- Mock API Functions ---

export const getAvailableDates = async (): Promise<string[]> => {
    await sleep(300);
    const dateSet = new Set<string>();
    MOCK_ARTICLES.forEach(article => {
        dateSet.add(new Date(article.published).toISOString().split('T')[0]);
    });
    return Array.from(dateSet).sort((a, b) => b.localeCompare(a));
};

export const getBriefingReportsByDate = async (date: string): Promise<BriefingReport[]> => {
    await sleep(500);
    const articlesForDate = MOCK_ARTICLES.filter(a => a.published.startsWith(date));
    
    if (articlesForDate.length === 0) return [];
    
    // Group by briefing section
    const techArticles = articlesForDate.filter(a => a.briefingSection === '技术前沿');
    const deepDiveArticles = articlesForDate.filter(a => a.briefingSection === '深度观察');

    const reports: BriefingReport[] = [];
    if (techArticles.length > 0) {
        reports.push({ id: 1, title: '技术前沿简报', articles: techArticles });
    }
    if (deepDiveArticles.length > 0) {
        reports.push({ id: 2, title: '深度观察简报', articles: deepDiveArticles });
    }
    return reports;
};

export const markAllAsRead = async (): Promise<void> => {
    await sleep(1000);
    console.log("Marking all articles as read...");
    const READ_TAG = 'user/-/state/com.google/read';
    MOCK_ARTICLES.forEach(article => {
        if (!article.tags) {
            article.tags = [];
        }
        if (!article.tags.includes(READ_TAG)) {
            article.tags.push(READ_TAG);
        }
    });
    console.log("All articles marked as read.");
};

export const getCleanArticleContent = async (article: Article): Promise<CleanArticleContent> => {
    await sleep(800);
    try {
        const readabilityUrl = `/api/readability?url=${encodeURIComponent(article.link)}`;
        console.log('Fetching article content from:', readabilityUrl);
        const response = await fetch(readabilityUrl);
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Readability API error:', response.status, errorText);
            throw new Error(`Failed to fetch readable content from backend: ${response.status} ${errorText}`);
        }
        return await response.json();
    } catch(e) {
        console.error("Using mock readability content due to error:", e);
        return {
            title: article.title,
            source: article.sourceName,
            content: `<h3>无法加载文章内容</h3><p>由于网络限制或目标网站策略，无法获取文章的阅读模式内容。请尝试直接访问原文链接。</p><p><a href="${article.link}" target="_blank" rel="noopener noreferrer">点击此处查看原文</a></p>`
        }
    }
};

export const getArticleStates = async (articleIds: (string | number)[]): Promise<{ [key: string | number]: string[] }> => {
    await sleep(200);
    const states: { [key: string | number]: string[] } = {};
    const idSet = new Set(articleIds);
    MOCK_ARTICLES.forEach(article => {
        if (idSet.has(article.id)) {
            states[article.id] = article.tags || [];
        }
    });
    return states;
};

const findArticle = (id: string | number) => MOCK_ARTICLES.find(a => a.id === id);

export const editArticleState = async (articleId: string | number, action: 'star' | 'read', isAdding: boolean): Promise<void> => {
    await sleep(400);
    const article = findArticle(articleId);
    if (!article) return;

    const STAR_TAG = 'user/-/state/com.google/starred';
    const READ_TAG = 'user/-/state/com.google/read';
    const tag = action === 'star' ? STAR_TAG : READ_TAG;
    
    if (!article.tags) article.tags = [];

    const hasTag = article.tags.includes(tag);

    if (isAdding && !hasTag) {
        article.tags.push(tag);
    } else if (!isAdding && hasTag) {
        article.tags = article.tags.filter(t => t !== tag);
    }
    console.log(`Updated state for ${articleId}:`, article.tags);
};

export const getTags = async (): Promise<Tag[]> => {
    await sleep(200);
    return MOCK_TAGS;
};

export const editArticleTag = async (articleId: string | number, tagsToAdd: string[], tagsToRemove: string[]): Promise<void> => {
    await sleep(500);
    const article = findArticle(articleId);
    if (!article) return;

    if (!article.tags) article.tags = [];

    // Remove tags
    const tagsToRemoveSet = new Set(tagsToRemove);
    article.tags = article.tags.filter(t => !tagsToRemoveSet.has(t));

    // Add tags
    const existingTagsSet = new Set(article.tags);
    tagsToAdd.forEach(tag => {
        if (!existingTagsSet.has(tag)) {
            article.tags!.push(tag);
        }
    });
    console.log(`Updated tags for ${articleId}:`, article.tags);
};

export const getArticlesByCategory = async (category: string): Promise<Article[]> => {
    try {
        const response = await fetch(`/api/articles?type=category&value=${encodeURIComponent(category)}`);
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Failed to fetch articles for category ${category}, falling back to mock data:`, error);
        return MOCK_ARTICLES.filter(a => a.category === category);
    }
};

export const getArticlesByTag = async (tag: string): Promise<Article[]> => {
    try {
        const response = await fetch(`/api/articles?type=tag&value=${encodeURIComponent(tag)}`);
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Failed to fetch articles for tag ${tag}, falling back to mock data:`, error);
        const tagId = MOCK_TAGS.find(t => t.label === tag)?.id;
        return MOCK_ARTICLES.filter(a => a.tags?.includes(tagId || ''));
    }
};

export const getStarredArticles = async (): Promise<Article[]> => {
    try {
        const response = await fetch(`/api/starred`);
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Failed to fetch starred articles, falling back to mock data:`, error);
        return MOCK_ARTICLES.filter(a => a.tags?.includes('user/-/state/com.google/starred'));
    }
};

export const getAvailableFilters = async (): Promise<AvailableFilters> => {
    try {
        const response = await fetch('/api/filters');
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        const data = await response.json();
        if (!data.categories || !data.tags) {
            throw new Error('Invalid data format from /api/filters');
        }
        return data;
    } catch (error) {
        console.error("Failed to fetch available filters, falling back to mock data:", error);
        
        // Fallback to mock data on error
        const categories = new Set<string>();
        MOCK_ARTICLES.forEach(a => categories.add(a.category));
        const tags = MOCK_TAGS.map(t => t.label);

        return {
            categories: Array.from(categories).sort(),
            tags: tags.sort(),
        };
    }
};
