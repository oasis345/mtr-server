// src/cache/cache-key.ts
type KeyPart = string | number | boolean | null | undefined;

export const buildCacheKey = (ns: string, parts: KeyPart[], query?: Record<string, KeyPart>) => {
  const segs = [ns, ...parts.filter(Boolean).map(String)];
  if (query && Object.keys(query).length) {
    const kv = Object.entries(query)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`);
    segs.push(kv.join('&'));
  }
  return segs.join(':');
};

export const buildMarketCacheKey = (p: {
  assetType: string;
  dataType: string;
  timeframe?: string;
  symbols?: string[] | string;
}) => {
  const symbols = Array.isArray(p.symbols) ? p.symbols.join(',') : p.symbols || '';
  return buildCacheKey('market', [p.assetType, p.dataType, p.timeframe || '', symbols]);
};
