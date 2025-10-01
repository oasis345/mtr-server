// src/financial/cache/candle-ttl.ts
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

export const candleTTLSeconds = (timeframe?: string) => {
  //   const open = isUsMarketOpenNow();
  const tf = (timeframe || '').toLowerCase();
  if (tf.includes('1T') || tf.includes('3T') || tf.includes('5T')) return open ? 60 : 600;
  if (tf.includes('10T') || tf.includes('30T') || tf.includes('1H')) return open ? 300 : 1800;
  if (tf.includes('1D') || tf.includes('day')) return 43200; // 12h
  if (tf.includes('1W') || tf.includes('week')) return 604800; // 7d
  if (tf.includes('1M') || tf.includes('month') || tf.includes('12M')) return 604800; // 7d
  return 300; // 기본
};

export const symbolTTLSeconds = () => (isUsMarketOpenNow() ? 10 : 60);
