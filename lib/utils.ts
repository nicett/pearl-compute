/**
 * shadcn 默认 utils 文件 —— 重新导出 cn
 *
 * shadcn 组件源码默认 import { cn } from "@/lib/utils"
 * 我们让它指向 app/lib/cn 里的实现，避免重复
 */
export { cn } from '@/app/lib/cn';
