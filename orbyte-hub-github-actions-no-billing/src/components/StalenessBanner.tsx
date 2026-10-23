import React from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';

interface StalenessBannerProps {
  isStale: boolean;
  daysAgo: number;
  onSyncClick: () => void;
  language: 'en' | 'bm';
}

export const StalenessBanner: React.FC<StalenessBannerProps> = ({
  isStale,
  daysAgo,
  onSyncClick,
  language,
}) => {
  if (!isStale) return null;
  const isBM = language === 'bm';

  return (
    <div className="bg-amber-500 text-amber-950 px-4 sm:px-6 py-2.5 text-xs font-semibold flex flex-wrap items-center justify-between gap-3 border-b border-amber-600/30">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-950 shrink-0" />
        <span>
          <strong>{isBM ? 'Amaran Ketinggalan Dasar:' : 'Policy Staleness Notice:'}</strong>{' '}
          {isBM
            ? 'Pek dasar ini menggunakan data demo setempat dan belum disahkan melalui penyelarasan rasmi secara langsung.'
            : 'This policy pack uses local demo fixtures and has not been verified through a live official-source sync.'}
        </span>
      </div>

      <button
        onClick={onSyncClick}
        className="h-8 px-3 bg-amber-950 hover:bg-black text-white rounded-lg text-xs font-bold transition-colors shrink-0 flex items-center gap-1.5 shadow-2xs cursor-pointer"
      >
        <ArrowRight className="w-3.5 h-3.5" />
        <span>{isBM ? 'Lihat Status Sumber' : 'View Source Status'}</span>
      </button>
    </div>
  );
};
