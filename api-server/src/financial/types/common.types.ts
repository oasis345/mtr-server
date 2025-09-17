import { Asset, AssetType } from '@/common/types/asset.types';
import { normalizeSymbols } from '@/common/utils/normalize';
import { Transform } from 'class-transformer';
import { FinancialProvider } from '../providers/financial.provider';

export enum MarketDataType {
  ASSETS = 'assets',
  MOST_ACTIVE = 'mostActive',
  GAINERS = 'gainers',
  LOSERS = 'losers',
  SYMBOL = 'symbol',
  TOP_TRADED = 'topTraded',
}

// ✅ 거래소 타입 (주식 + 코인)
export enum FINANCIAL_PROVIDERS {
  FMP = 'FMP',
  YAHOO = 'YAHOO',
  BLOOMBERG = 'BLOOMBERG',
  ALPACA = 'ALPACA',
}

// ✅ 범용 쿼리 파라미터
export class AssetQueryParams {
  assetType: AssetType; // 주식, 코인
  dataType: MarketDataType; // 시장 데이터 타입
  @Transform(({ value }: { value: string | string[] }) => normalizeSymbols(value))
  symbols?: string[]; // 여러 심볼 조회용
  limit?: number; // 제한
  orderBy?: string; // 정렬 순서
}

export type AssetMethod<T extends AssetQueryParams = AssetQueryParams> = (params: T) => Promise<Asset[]>;
export type DataTypeMethodMap = Map<MarketDataType, keyof FinancialProvider>;

export interface CacheConfig {
  ttl: number;
  refreshInterval?: string;
  reason?: string;
}

// export type TossCandleData = {
//   dt: string;
//   base: number;
//   open: number;
//   high: number;
//   low: number;
//   close: number;
//   volume: number;
//   amount: number;
// };

// export type ChartCandle = {
//   time: number | string;
//   open: number;
//   high: number;
//   low: number;
//   close: number;
// };

// export type ChartVolume = {
//   time: number | string;
//   value: number;
//   color?: string;
// };
