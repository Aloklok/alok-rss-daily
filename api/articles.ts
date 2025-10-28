import type { VercelRequest, VercelResponse } from '@vercel/node';
// import { createClient } from '@supabase/supabase-js';

// ** IMPORTANT **
// This function is a placeholder. You need to replace the mock data logic
// with your actual Supabase queries. The Supabase client is commented out
// to prevent errors during generation, but the structure is here for you.

// const supabaseUrl = process.env.SUPABASE_URL;
// const supabaseKey = process.env.SUPABASE_KEY;
// const supabase = createClient(supabaseUrl, supabaseKey);


// MOCK DATA to simulate Supabase response
const MOCK_DB_ARTICLES = [
    {
        "id": "7aa5a623-2b98-4ca2-a619-79660b110cdf",
        "created_at": new Date().toISOString(),
        "title": "Uno Platform 6.3新增.NET 10预览版支持，并为VS 2026做好准备",
        "link": "https://www.infoq.cn/article/Kql1zUw4dkmOsgWVBrhL",
        "sourceName": "InfoQ - 后端",
        "published": "2025-10-28T04:00:00.000Z",
        "category": "前端开发",
        "keywords": ["Uno Platform", ".NET 10", "Visual Studio 2026", "WebAssembly", "跨平台UI"],
        "verdict": {"type": "新闻事件型", "score": 6, "importance": "常规更新"},
        "summary": "这是一次典型的**生态卡位战**，团队需要关注它是否会影响现有项目的升级路径和工具链稳定性。",
        "highlights": "支持 **.NET 10 RC1** 是前瞻性布局...",
        "critiques": "Hot Design编辑器加了个可搜索树就当亮点宣传？...",
        "marketTake": "国内吹XAML跨平台的已经快绝种了...",
        "tldr": "Uno Platform 6.3支持.NET 10预览版和VS 2026新格式。"
    },
    {
        id: 1,
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        title: 'LangChain彻底重写：从开源副业到独角兽...',
        link: 'https://www.infoq.cn/article/OSEpqr1rIQdRoU6uaFhV',
        sourceName: 'InfoQ - AI＆大模型',
        published: '2025-10-27T10:00:00Z',
        category: 'AI与前沿科技',
        keywords: ['LangChain', 'LLM框架'],
        verdict: { type: '知识洞察型', score: 9 },
        tldr: 'LangChain 1.0 彻底重写...',
        summary: '这篇文章详细拆解了LangChain...',
        highlights: 'LangChain 1.0 基于 LangGraph 重写...',
        critiques: 'LangChain早期过度追求...',
        marketTake: 'LangChain以12.5亿美元估值成为独角兽...',
  },
];


export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { type, value } = req.query;

    try {
        // let query = supabase.from('articles').select('*');
        
        // This is where you would build your real Supabase query
        // Example:
        // if (type === 'date' && typeof value === 'string') {
        //     const date = new Date(value);
        //     const nextDay = new Date(date);
        //     nextDay.setDate(date.getDate() + 1);
        //     query = query.gte('published', date.toISOString()).lt('published', nextDay.toISOString());
        // } else if (type === 'category' && typeof value === 'string') {
        //     query = query.eq('category', value);
        // } else if (type === 'tag' && typeof value === 'string') {
        //     query = query.cs('keywords', `{"${value}"}`);
        // } else if (type === 'starred') {
        //     // For 'starred', you would first fetch starred IDs from FreshRSS
        //     // then use them in the query, e.g., query.in('id', starredIds)
        // }
        
        // const { data, error } = await query.order('published', { ascending: false });

        // if (error) {
        //     throw error;
        // }
        
        // Using mock data for now
        let data = MOCK_DB_ARTICLES;

        res.status(200).json(data);

    } catch (error: any) {
        console.error("Error in /api/articles:", error);
        res.status(500).json({ message: 'Error fetching articles', error: error.message });
    }
}
