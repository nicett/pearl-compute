'use client';

import { MutableRefObject } from 'react';

interface ChartPanelProps {
  compChartRef: MutableRefObject<HTMLCanvasElement | null>;
  projChartRef: MutableRefObject<HTMLCanvasElement | null>;
  t: (key: string) => string;
}

export default function ChartPanel({
  compChartRef,
  projChartRef,
  t,
}: ChartPanelProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="rounded-md border bg-muted/30 p-4 flex flex-col">
        <h3 className="text-xs font-semibold text-muted-foreground text-center mb-4">
          {t('pieChart')}
        </h3>
        <div className="relative flex-grow min-h-[220px]">
          <canvas ref={(node) => { compChartRef.current = node; }} />
        </div>
      </div>
      <div className="rounded-md border bg-muted/30 p-4 flex flex-col">
        <h3 className="text-xs font-semibold text-muted-foreground text-center mb-4">
          {t('barChart')}
        </h3>
        <div className="relative flex-grow min-h-[220px]">
          <canvas ref={(node) => { projChartRef.current = node; }} />
        </div>
      </div>
    </div>
  );
}
