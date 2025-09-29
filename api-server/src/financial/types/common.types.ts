import { Asset, AssetType, ChartTimeframe } from '@/common/types';
import { normalizeSymbols } from '@/common/utils/normalize';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsPositive, Max, Min } from 'class-validator';
import { FinancialProvider } from '../providers/financial.provider';

export enum MarketDataType {
  ASSETS = 'assets',
  MOST_ACTIVE = 'mostActive',
  GAINERS = 'gainers',
  LOSERS = 'losers',
  SYMBOL = 'symbol',
  TOP_TRADED = 'topTraded',
  CANDLES = 'candles',
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
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number; // 제한
  timeframe?: ChartTimeframe; // 시간대
  // orderBy?: string; // 정렬 순서
  // start?: string; // 시작 시간
  // end?: string; // 종료 시간
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

// [
//   {
//     "market": "KRW-BTC",
//     "candle_date_time_utc": "2025-06-30T23:59:59",
//     "candle_date_time_kst": "2025-07-01T08:59:59",
//     "opening_price": 145794000,
//     "high_price": 145794000,
//     "low_price": 145759000,
//     "trade_price": 145759000,
//     "timestamp": 1751327999833,
//     "candle_acc_trade_price": 185042,
//     "candle_acc_trade_volume": 0.0013
//   }
// ]

// {
//   "bars": {
//     "TSLA": {
//       "c": 425.62,
//       "h": 425.91,
//       "l": 425.325,
//       "n": 157,
//       "o": 425.78,
//       "t": "2025-09-17T19:59:00Z",
//       "v": 13153,
//       "vw": 425.574485
//     }
//   }
// }

export interface Candle {
  /**
   * 종목을 식별하는 심볼 (e.g., 'TSLA', 'BTC/KRW')
   */
  symbol: string;

  /**
   * 캔들이 시작된 시점의 가격 (from Alpaca's 'o')
   */
  open: number;

  /**
   * 캔들 기간 동안의 최고가 (from Alpaca's 'h')
   */
  high: number;

  /**
   * 캔들 기간 동안의 최저가 (from Alpaca's 'l')
   */
  low: number;

  /**
   * 캔들이 마감된 시점의 가격 (from Alpaca's 'c')
   */
  close: number;

  /**
   * 캔들 기간 동안의 총 거래량 (from Alpaca's 'v')
   */
  volume: number;

  /**
   * 캔들의 타임스탬프 (ISO 8601 형식의 문자열) (from Alpaca's 't')
   */
  timestamp: string;

  /**
   * (선택사항) 캔들 기간 동안의 총 거래 체결 건수 (from Alpaca's 'n')
   */
  tradeCount?: number;

  // 거래량 가중 평균 가격
  vwap: number;
}

export interface TossCandle {
  market: string; // 시장
  candle_date_time_utc: string; // 날짜
  candle_date_time_kst: string; // 날짜
  opening_price: number; // 시가
  high_price: number; // 고가
  low_price: number; // 저가
  trade_price: number; // 종가
  timestamp: number; // 시간
  candle_acc_trade_price: number; // 거래대금
  candle_acc_trade_volume: number; // 거래량
}

// export type TossCandleData = {
//   dt: string; // 날짜
//   base: number; // 기준 통화
//   open: number; // 시가
//   high: number; // 고가
//   low: number; // 저가
//   close: number; // 종가
//   volume: number; // 거래량
//   amount: number; // 거래대금
// };

// export type ChartCandle = {
//   time: number | string; // 시간
//   open: number; // 시가
//   high: number; // 고가
//   low: number; // 저가
//   close: number; // 종가
// };

// export type ChartVolume = {
//   time: number | string; // 시간
//   value: number; // 거래량
//   color?: string; // 색상
// };
