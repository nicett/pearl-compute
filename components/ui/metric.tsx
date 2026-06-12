"use client"

import { TrendingDown, TrendingUp } from "lucide-react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * Metric — 业务组件，shadcn 没有对应 primitive
 * 风格上对齐 shadcn token (card / muted-foreground / primary / destructive 等)
 *
 * 用法：
 *   <Metric label="算力" value="295.5 KH/s" tone="primary" />
 *   <Metric label="24h" value="2.71 PRL" trend="up" trendValue="+12%" />
 */

type Tone = "default" | "primary" | "success" | "destructive" | "warning"
type Trend = "up" | "down" | "flat"

interface MetricProps {
  label: string
  value: ReactNode
  tone?: Tone
  hint?: ReactNode
  trend?: Trend
  trendValue?: string
  inline?: boolean
  className?: string
}

const TONE: Record<Tone, string> = {
  default: "text-foreground",
  primary: "text-primary",
  success: "text-success",
  destructive: "text-destructive",
  warning: "text-warning",
}

export function Metric({
  label,
  value,
  tone = "default",
  hint,
  trend,
  trendValue,
  inline = false,
  className,
}: MetricProps) {
  const trendColor =
    trend === "up"
      ? "text-success"
      : trend === "down"
      ? "text-destructive"
      : "text-muted-foreground"
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : null

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5",
        !inline && "rounded-md border bg-card p-3",
        className
      )}
    >
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className={cn("text-xl font-semibold font-mono leading-none", TONE[tone])}>
        {value}
      </div>
      {(hint || trend) && (
        <div className="flex items-center gap-2 text-xs">
          {trend && trendValue && (
            <span className={cn("inline-flex items-center gap-1", trendColor)}>
              {TrendIcon && <TrendIcon className="h-3 w-3" />}
              <span className="font-mono">{trendValue}</span>
            </span>
          )}
          {hint && <span className="text-muted-foreground">{hint}</span>}
        </div>
      )}
    </div>
  )
}
