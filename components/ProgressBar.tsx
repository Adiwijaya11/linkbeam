import React from 'react';

interface ProgressBarProps {
  progress: number; // 0 to 100
}

export function ProgressBar({ progress }: ProgressBarProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden shadow-inner">
      <div
        className="bg-brand-accent h-4 rounded-full transition-all duration-300 ease-out flex items-center justify-end px-2"
        style={{ width: `${clampedProgress}%` }}
      >
        {clampedProgress > 10 && (
          <span className="text-[10px] font-bold text-white leading-none">
            {Math.round(clampedProgress)}%
          </span>
        )}
      </div>
    </div>
  );
}
