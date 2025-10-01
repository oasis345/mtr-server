import type { AxiosError } from 'axios';

const safeStringify = (v: any) => {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
};

export const getErrorMessage = (err: unknown): string => {
  if (!err) return 'Unknown error';

  // 1) Axios 계열 우선 처리
  const ax = err as Partial<AxiosError> & { isAxiosError?: boolean; response?: any };
  if (ax?.isAxiosError || ax?.response) {
    const { status, statusText, data } = ax.response ?? {};
    const dataMsg =
      (typeof data === 'string' && data) ||
      data?.message ||
      data?.error?.message ||
      data?.error ||
      (data ? safeStringify(data) : undefined);
    const base = (ax as any)?.message;
    return [status && statusText ? `${status} ${statusText}` : null, dataMsg || base].filter(Boolean).join(' - ');
  }

  // 2) 일반 Error
  if (err instanceof Error) return err.message || 'Error';

  // 3) 그 외
  if (typeof err === 'string') return err;
  const anyErr = err as any;
  return anyErr?.message || anyErr?.toString?.() || 'Error';
};
