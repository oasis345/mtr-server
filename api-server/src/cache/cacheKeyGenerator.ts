type KeyPart = string | number | boolean | null | undefined;

export const generateCacheKey = (ns: string, parts: KeyPart[], query?: Record<string, KeyPart>): string => {
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
