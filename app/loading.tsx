export default function Loading() {
  return (
    <div className="min-h-screen bg-surface-dark">
      {/* Top bar */}
      <div className="bg-surface border-b border-edge">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-3 flex items-center justify-between">
          <div className="h-4 w-32 bg-edge animate-pulse" />
          <div className="h-4 w-24 bg-edge animate-pulse" />
        </div>
      </div>

      {/* Three columns */}
      <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-4 lg:py-6">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-5">
          {/* Left */}
          <div className="w-full lg:w-[340px] xl:w-[380px] flex-shrink-0">
            <div className="bg-surface border border-edge animate-pulse">
              <div className="px-5 py-3 border-b border-edge"><div className="h-3 w-20 bg-edge" /></div>
              <div className="p-5 space-y-4">
                <div className="h-10 w-32 bg-edge" />
                <div className="h-10 bg-edge" />
                <div className="grid grid-cols-2 gap-4"><div className="h-10 bg-edge" /><div className="h-10 bg-edge" /></div>
                <div className="grid grid-cols-2 gap-4"><div className="h-10 bg-edge" /><div className="h-10 bg-edge" /></div>
              </div>
            </div>
          </div>

          {/* Center */}
          <div className="w-full lg:flex-1 min-w-0">
            <div className="bg-surface border border-edge animate-pulse">
              <div className="px-5 py-3 border-b border-edge"><div className="h-3 w-20 bg-edge" /></div>
              <div className="p-5">
                <div className="h-10 sm:h-14 w-40 sm:w-48 bg-edge mb-5" />
                <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-3 sm:mb-4">
                  {[1,2,3].map(i => <div key={i} className="h-14 sm:h-16 bg-edge" />)}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-5">
                  {[1,2,3,4].map(i => <div key={i} className="h-14 sm:h-16 bg-edge" />)}
                </div>
                <div className="h-4 w-32 bg-edge mb-4" />
                <div className="grid grid-cols-2 gap-4 sm:gap-6 mb-5">
                  <div className="h-16 sm:h-20 bg-edge" />
                  <div className="h-16 sm:h-20 bg-edge" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                  {[1,2,3,4].map(i => <div key={i} className="h-16 sm:h-20 bg-edge" />)}
                </div>
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="w-full lg:w-[320px] xl:w-[360px] flex-shrink-0">
            <div className="bg-surface border border-edge animate-pulse">
              <div className="px-5 py-3 border-b border-edge"><div className="h-3 w-20 bg-edge" /></div>
              <div className="p-5 space-y-4">
                <div className="space-y-3">
                  {[1,2,3].map(i => <div key={i} className="h-6 bg-edge" />)}
                </div>
                <div className="h-10 bg-edge" />
                <div className="h-48 sm:h-52 bg-edge" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
