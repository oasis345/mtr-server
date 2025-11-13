// src/financial/cache/buildMarketCacheKey.ts

export const buildMarketCacheKey = (p: {
  assetType: string;
  dataType: string;
  timeframe?: string;
  symbols?: string[] | string;
  start?: string;
  end?: string;
  orderBy?: 'asc' | 'desc';
  limit?: number;
}) => {
  const symbols = Array.isArray(p.symbols) ? p.symbols.join(',') : p.symbols || '';
  const q = [
    p.start && `start=${p.start}`,
    p.end && `end=${p.end}`,
    // p.orderBy && `order=${p.orderBy}`,
    // typeof p.limit === 'number' && `limit=${p.limit}`,
  ]
    .filter(Boolean)
    .join('&');
  return ['market', p.assetType, p.dataType, p.timeframe || '', symbols, q].filter(Boolean).join(':');
};
