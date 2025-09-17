export const normalizeSymbols = (input?: string | string[]): string[] => {
  const items = Array.isArray(input) ? input : input ? [input] : [];
  const normalized = items
    .flatMap(s => s.split(','))
    .map(s => s.trim().toUpperCase())
    .filter(Boolean);
  return Array.from(new Set(normalized)).sort();
};
