'use client';

interface InfoIconProps {
  tooltip: string;
  position?: 'left' | 'right';
}

export default function InfoIcon({ tooltip, position = 'right' }: InfoIconProps) {
  const posClass = position === 'left'
    ? 'bottom-full right-0'
    : 'bottom-full left-0';

  return (
    <div className="group relative inline-flex items-center">
      <span className="text-xs text-muted/30 opacity-0 group-hover:opacity-100 transition-opacity cursor-help font-mono">
        [?]
      </span>
      <div className={`tooltip-industrial ${posClass} mb-2 w-56 text-xs`}>
        {tooltip}
      </div>
    </div>
  );
}
