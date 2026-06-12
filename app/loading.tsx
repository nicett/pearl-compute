/**
 * 路由级加载占位 — 三栏布局骨架，配合首页计算器初次加载
 */
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="bg-card border-b">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-6 h-14 flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>

      {/* Three columns */}
      <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-4 lg:py-6">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-5">
          {/* Left */}
          <div className="w-full lg:w-[340px] xl:w-[380px] flex-shrink-0">
            <div className="rounded-lg border bg-card">
              <div className="px-5 py-3 border-b">
                <Skeleton className="h-3 w-20" />
              </div>
              <div className="p-5 space-y-4">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-full" />
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-10" />
                  <Skeleton className="h-10" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-10" />
                  <Skeleton className="h-10" />
                </div>
              </div>
            </div>
          </div>

          {/* Center */}
          <div className="w-full lg:flex-1 min-w-0">
            <div className="rounded-lg border bg-card">
              <div className="px-5 py-3 border-b">
                <Skeleton className="h-3 w-20" />
              </div>
              <div className="p-5">
                <Skeleton className="h-10 sm:h-14 w-40 sm:w-48 mb-5" />
                <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-3 sm:mb-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-14 sm:h-16" />
                  ))}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-5">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-14 sm:h-16" />
                  ))}
                </div>
                <Skeleton className="h-4 w-32 mb-4" />
                <div className="grid grid-cols-2 gap-4 sm:gap-6 mb-5">
                  <Skeleton className="h-16 sm:h-20" />
                  <Skeleton className="h-16 sm:h-20" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-16 sm:h-20" />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="w-full lg:w-[320px] xl:w-[360px] flex-shrink-0">
            <div className="rounded-lg border bg-card">
              <div className="px-5 py-3 border-b">
                <Skeleton className="h-3 w-20" />
              </div>
              <div className="p-5 space-y-4">
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-6" />
                  ))}
                </div>
                <Skeleton className="h-10" />
                <Skeleton className="h-48 sm:h-52" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
