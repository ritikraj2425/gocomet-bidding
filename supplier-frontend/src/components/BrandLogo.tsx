import React from 'react';

type BrandLogoProps = { compact?: boolean; light?: boolean };

export default function BrandLogo({ compact = false, light = false }: BrandLogoProps) {
  return (
    <span className={`brand-lockup${light ? ' brand-lockup-light' : ''}`}>
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 28 28" role="img">
          <path d="M19.4 8.3A8 8 0 1 0 21.8 14H14m7.8 0v5m0-5h-5" />
        </svg>
      </span>
      {!compact && <span className="brand-word">GoComet<span>Flow</span></span>}
    </span>
  );
}
