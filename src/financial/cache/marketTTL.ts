// src/financial/cache/candle-ttl.ts
import { ChartTimeframe } from '@/common/types';

export const isUsMarketOpenNow = () => {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun
  if (day === 0 || day === 6) return false;
  const hh = now.getUTCHours(),
    mm = now.getUTCMinutes();
  const mins = hh * 60 + mm;
  // NYSE 대략 13:30~20:00 UTC
  return mins >= 13 * 60 + 30 && mins <= 20 * 60;
};

export const getCandleTTL = (timeframe?: ChartTimeframe) => {
  //   const open = isUsMarketOpenNow();
  if (timeframe?.includes('1T') || timeframe?.includes('3T') || timeframe?.includes('5T')) return 60;
  if (timeframe?.includes('10T') || timeframe?.includes('30T') || timeframe?.includes('1H')) return 300;
  if (timeframe?.includes('1D') || timeframe?.includes('day')) return 43200; // 12h
  if (timeframe?.includes('1W') || timeframe?.includes('week')) return 604800; // 7d
  if (timeframe?.includes('1M') || timeframe?.includes('month') || timeframe?.includes('12M')) return 604800; // 7d
  return 300; // 기본
};

export const getSymbolTTL = () => 10;
