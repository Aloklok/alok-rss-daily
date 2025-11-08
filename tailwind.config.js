/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',            // ✅ 自动跟随系统
  content: [
   // 1. 告诉 Tailwind 扫描根目录下的所有相关文件
   "./**/*.{html,ts,tsx,mdx}",

   // 2. 但是，使用 "!" 符号，明确排除掉所有不需要扫描的目录
   "!./node_modules/**", // 排除所有 node_modules
   "!./dist/**",         // 排除构建输出目录
   "!./.vercel/**",      // 排除 Vercel 的本地缓存
   
   // 3. (推荐) 你的 API 目录也不包含 Tailwind 样式，一并排除
   "!./api/**"
  ],
  theme: {
    extend: {
      backgroundImage: {
        'paper-texture': "url('/paper-texture.png')",
      },
      fontFamily: {
        sans: [
          'system-ui','-apple-system','BlinkMacSystemFont','"Segoe UI"','Roboto',
          '"Helvetica Neue"','Arial','"Noto Sans"','"PingFang SC"','"Hiragino Sans GB"',
          '"Microsoft YaHei"','"Noto Sans CJK SC"','sans-serif'
        ],
        serif: ['ui-serif','Georgia','Cambria','"Times New Roman"','Times','serif']
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
