// src/utils/colorUtils.ts

const TAG_COLOR_CLASSES = [
  'bg-sky-100 text-sky-800', 
  'bg-emerald-100 text-emerald-800', 
  'bg-violet-100 text-violet-800', 
  'bg-rose-100 text-rose-800', 
  'bg-amber-100 text-amber-800', 
  'bg-cyan-100 text-cyan-800'
];

/**
 * 根据输入的字符串（如标签名）生成一个确定性的、好看的 Tailwind 颜色类名。
 * @param key - 用于生成哈希值的字符串。
 * @returns 返回一个 Tailwind CSS 类名字符串，例如 'bg-sky-100 text-sky-800'。
 */
export const getRandomColorClass = (key: string): string => {
  // 1. 【增加】对 key 不存在的情况进行健壮性处理
  if (!key) return TAG_COLOR_CLASSES[0];
  
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash % TAG_COLOR_CLASSES.length);
  return TAG_COLOR_CLASSES[index];
};