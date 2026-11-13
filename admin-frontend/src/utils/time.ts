import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Parse backend UTC datetime and convert to IST (Asia/Kolkata, UTC+5:30).
 * Handles strings with or without trailing 'Z' / offset.
 */
export function toIST(dateStr: string | Date | undefined | null): dayjs.Dayjs {
  if (!dateStr) return dayjs();

  const str = typeof dateStr === 'string' ? dateStr : dateStr.toISOString();
  const hasTimezoneOffset =
    str.endsWith('Z') ||
    str.includes('+') ||
    (str.length > 19 && (str.slice(19).includes('-') || str.slice(19).includes('+')));

  const parsed = hasTimezoneOffset ? dayjs(str) : dayjs.utc(str);
  return parsed.tz(IST_TIMEZONE);
}

/**
 * Format as 12-hour IST: "13 Nov 2026, 10:30:00 PM IST"
 */
export function formatDateTime(dateStr: string | Date | undefined | null): string {
  if (!dateStr) return 'N/A';
  return `${toIST(dateStr).format('DD MMM YYYY, hh:mm:ss A')} IST`;
}

/**
 * Format as 12-hour IST without seconds: "13 Nov 2026, 10:30 PM IST"
 */
export function formatDateTimeShort(dateStr: string | Date | undefined | null): string {
  if (!dateStr) return 'N/A';
  return `${toIST(dateStr).format('DD MMM YYYY, hh:mm A')} IST`;
}

/**
 * Format time only (12-hour IST): "10:30:00 PM IST"
 */
export function formatTime(dateStr: string | Date | undefined | null): string {
  if (!dateStr) return 'N/A';
  return `${toIST(dateStr).format('hh:mm:ss A')} IST`;
}

/**
 * Format short time: "10:30 PM (13 Nov)"
 */
export function formatTimeShort(dateStr: string | Date | undefined | null): string {
  if (!dateStr) return 'N/A';
  return toIST(dateStr).format('hh:mm A (DD MMM)');
}

/**
 * Format date only: "13 Nov 2026"
 */
export function formatDate(dateStr: string | Date | undefined | null): string {
  if (!dateStr) return 'N/A';
  return toIST(dateStr).format('DD MMM YYYY');
}

/**
 * Format currency with Indian grouping: "₹ 50,000" or "INR 50,000"
 */
export function formatCurrency(amount: number | null | undefined, currency = 'INR'): string {
  if (amount === null || amount === undefined) return 'N/A';
  const symbol = currency === 'INR' ? '₹' : currency;
  return `${symbol} ${Number(amount).toLocaleString('en-IN')}`;
}

/**
 * Determine if an auction is truly live and accepting bids right now.
 */
export function isAuctionLive(rfq: { status: string; bid_close_time: string }): boolean {
  if (rfq.status !== 'ACTIVE') return false;
  return toIST(rfq.bid_close_time).isAfter(dayjs());
}

