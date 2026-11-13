import React from 'react';

interface RankBadgeProps {
  rank: number;
}

export default function RankBadge({ rank }: RankBadgeProps) {
  if (rank === 1) {
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '2px 10px',
          borderRadius: 4,
          fontWeight: 700,
          fontSize: 12,
          background: '#DCFCE7',
          color: '#15803D',
          border: '1px solid #86EFAC',
        }}
      >
        L1 (Lowest)
      </span>
    );
  }

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 4,
        fontWeight: 600,
        fontSize: 12,
        background: '#F1F5F9',
        color: '#475569',
        border: '1px solid #CBD5E1',
      }}
    >
      L{rank}
    </span>
  );
}
