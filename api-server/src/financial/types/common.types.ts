import { Asset, AssetType, Candle, ChartTimeframe } from '@/common/types';
import { normalizeSymbols } from '@/common/utils/normalize';
import { Transform } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsPositive, Max, Min } from 'class-validator';
import { FinancialProvider } from '../providers/financial.provider';

export enum MarketDataType {
  ASSETS = 'assets',
  MOST_ACTIVE = 'mostActive',
  GAINERS = 'gainers',
  LOSERS = 'losers',
  SYMBOL = 'symbol',
  TOP_TRADED = 'topTraded',
  CANDLES = 'candles',
  TRADES = 'trades',
}

// ✅ 범용 쿼리 파라미터
export class AssetQueryParams {
  @IsEnum(AssetType)
  assetType: AssetType; // 주식, 코인
  @IsEnum(MarketDataType)
  dataType: MarketDataType; // 시장 데이터 타입
  @IsOptional()
  @Transform(({ value }: { value: string | string[] }) => normalizeSymbols(value))
  symbols?: string[]; // 여러 심볼 조회용
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Min(1)
  @Max(1000) // API 남용 방지를 위한 최대값 설정
  @Transform(({ value }) => parseInt(value))
  limit?: number; // 제한
  timeframe?: ChartTimeframe; // 시간대
}

export class CandleQueryParams extends AssetQueryParams {
  @IsOptional()
  @Transform(({ value }: { value: string }) => value.toLowerCase())
  @IsIn(['asc', 'desc'])
  orderBy?: 'desc' | 'asc'; // 정렬 순서
  @IsOptional()
  start?: string; // 시작 시간
  @IsOptional()
  end?: string; // 종료 시간
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  limit?: number; // 제한
  nextDateTime?: string; // 다음 날짜 시간
}

export type AssetMethod<T extends AssetQueryParams = AssetQueryParams> = (params: T) => Promise<Asset[]>;
export type DataTypeMethodMap = Map<MarketDataType, keyof FinancialProvider>;
export type CacheTTL = number | ((params: AssetQueryParams) => number);

export interface CacheConfig {
  ttl: CacheTTL;
  refreshInterval?: string;
  reason?: string;
  warmup?: boolean;
  withLogo?: boolean;
}

export type CandleResponse = {
  candles: Candle[];
  nextDateTime: string | null;
};
