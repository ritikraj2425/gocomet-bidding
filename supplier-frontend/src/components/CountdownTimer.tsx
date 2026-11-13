import React, { useEffect, useState } from 'react';
import { toIST } from '../utils/time';

interface CountdownTimerProps {
  targetTime: string | Date;
  label?: string;
  size?: 'small' | 'normal' | 'large';
  showBadge?: boolean;
}

export default function CountdownTimer({
  targetTime,
  label,
  size = 'normal',
  showBadge = true,
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    const update = () => {
      const now = Date.now();
      const target = toIST(targetTime).valueOf();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft('Closed');
        setEnded(true);
        setUrgent(false);
        return;
      }

      setEnded(false);
      const totalSeconds = Math.floor(diff / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        const remHours = hours % 24;
        setTimeLeft(`${days}d ${remHours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeLeft(
          `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        );
      } else {
        setTimeLeft(
          `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        );
      }

      // Urgent if less than 3 minutes remaining
      setUrgent(diff < 180000);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetTime]);

  const fontSize = size === 'large' ? 28 : size === 'small' ? 13 : 16;

  if (ended && showBadge) {
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '2px 8px',
          borderRadius: 4,
          fontSize: size === 'small' ? 11 : 12,
          fontWeight: 600,
          background: '#F1F5F9',
          color: '#64748B',
          border: '1px solid #E2E8F0',
        }}
      >
        Auction Closed
      </span>
    );
  }

  return (
    <div style={{ textAlign: size === 'large' ? 'right' : 'left' }}>
      {label && (
        <div style={{ fontSize: 12, color: '#64748B', marginBottom: 2, fontWeight: 500 }}>
          {label}
        </div>
      )}
      <div
        style={{
          fontSize,
          fontWeight: 700,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '0.5px',
          color: ended ? '#64748B' : urgent ? '#DC2626' : '#2563EB',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {urgent && !ended && (
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: '#DC2626',
              animation: 'pulseDot 1s infinite',
            }}
          />
        )}
        <span>{timeLeft}</span>
      </div>
      <style>{`
        @keyframes pulseDot {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.4); opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
