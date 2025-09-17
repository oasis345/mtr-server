import { CacheTTL } from '@/common/constants/cache.constants';
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

export interface AssetServiceConfig {
  name: string;
  assetType: AssetType;
  dataTypeMethodMap: DataTypeMethodMap;
  cacheableDataTypeMap: Map<MarketDataType, CacheConfig>;
  defaultLimits: Map<MarketDataType, number>;
}

export const CRYPTO_ASSET_CONFIG: AssetServiceConfig = {
  name: 'CRYPTO_ASSET_CONFIG',
  assetType: AssetType.CRYPTO,
  dataTypeMethodMap: new Map([
    [MarketDataType.ASSETS, 'getAssets'],
    [MarketDataType.TOP_TRADED, 'getTopTraded'],
  ]),
  cacheableDataTypeMap: new Map<MarketDataType, CacheConfig>([
    [MarketDataType.ASSETS, { ttl: CacheTTL.EVERY_12_HOURS, refreshInterval: 'EVERY_12_HOURS' }],
    [MarketDataType.TOP_TRADED, { ttl: CacheTTL.ONE_MINUTE, refreshInterval: 'EVERY_MINUTE' }],
  ]),
  defaultLimits: new Map<MarketDataType, number>([[MarketDataType.TOP_TRADED, 200]]),
};

export const STOCK_ASSET_CONFIG: AssetServiceConfig = {
  name: 'STOCK_ASSET_CONFIG',
  assetType: AssetType.STOCK,
  dataTypeMethodMap: new Map([
    [MarketDataType.ASSETS, 'getAssets'],
    [MarketDataType.MOST_ACTIVE, 'getMostActive'],
    [MarketDataType.GAINERS, 'getTopGainers'],
    [MarketDataType.LOSERS, 'getTopLosers'],
    [MarketDataType.SYMBOL, 'getSnapshots'],
  ]),
  cacheableDataTypeMap: new Map<MarketDataType, CacheConfig>([
    [MarketDataType.ASSETS, { ttl: CacheTTL.EVERY_12_HOURS, refreshInterval: 'EVERY_12_HOURS' }],
    [MarketDataType.MOST_ACTIVE, { ttl: CacheTTL.ONE_MINUTE, refreshInterval: 'EVERY_MINUTE' }],
    [MarketDataType.GAINERS, { ttl: CacheTTL.ONE_MINUTE, refreshInterval: 'EVERY_MINUTE' }],
    [MarketDataType.LOSERS, { ttl: CacheTTL.ONE_MINUTE, refreshInterval: 'EVERY_MINUTE' }],
  ]),
  defaultLimits: new Map<MarketDataType, number>([
    [MarketDataType.MOST_ACTIVE, 50],
    [MarketDataType.GAINERS, 50],
    [MarketDataType.LOSERS, 50],
  ]),
};

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
