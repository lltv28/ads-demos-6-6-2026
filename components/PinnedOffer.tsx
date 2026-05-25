'use client';

import { ActionTask } from '@/lib/types';

interface PinnedOfferProps {
  offer: ActionTask;
  onTap: () => void;
}

function StarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="#f59e0b">
      <path d="M7 1.5L8.55 4.95L12.5 5.35L9.5 8.05L10.35 12L7 10.05L3.65 12L4.5 8.05L1.5 5.35L5.45 4.95L7 1.5Z" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#b45309" strokeWidth="1.5">
      <path d="M6 4l4 4-4 4" />
    </svg>
  );
}

export default function PinnedOffer({ offer, onTap }: PinnedOfferProps) {
  return (
    <button
      type="button"
      onClick={onTap}
      className="flex-shrink-0 w-full text-left cursor-pointer"
      style={{
        padding: '12px 16px',
        borderTop: '1px solid #E5E5E8',
        background: '#fffbeb',
        border: 'none',
        borderTopStyle: 'solid',
        borderTopWidth: '1px',
        borderTopColor: '#E5E5E8',
      }}
    >
      <div className="flex items-center gap-3">
        <StarIcon />
        <div className="flex-1 min-w-0">
          <div
            style={{
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--font-medium)',
              color: '#92400e',
            }}
          >
            {offer.title}
          </div>
          {offer.subtitle && (
            <div
              style={{
                fontSize: 'var(--text-2xs)',
                color: '#b45309',
              }}
            >
              {offer.subtitle}
            </div>
          )}
        </div>
        <ChevronRight />
      </div>
    </button>
  );
}
