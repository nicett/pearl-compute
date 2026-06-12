'use client';

import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface InfoIconProps {
  tooltip: string;
  position?: 'left' | 'right';
}

/**
 * 一个鼠标悬浮的小问号图标，显示提示文本。
 * 使用 shadcn Tooltip（Radix popper），位置自适应。
 *
 * 注：原 `position` 属性保留兼容，但 Radix 自动选择最佳位置，所以实际不再使用。
 */
export default function InfoIcon({ tooltip }: InfoIconProps) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center text-muted-foreground/60 hover:text-muted-foreground transition-colors cursor-help"
            aria-label="info"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs leading-relaxed">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
