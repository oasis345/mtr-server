export enum AssetType {
  STOCK = 'stocks',
  CRYPTO = 'crypto',
}

// ✅ 범용 자산 인터페이스
export interface Asset {
  symbol: string;
  name?: string;
  assetType: AssetType;
  exchange?: string;
  price?: number;
  volume?: number;
  change?: number;
  changePercentage?: number;
  currency?: string; // USD, KRW, BTC 등
  previousClose?: number; // 전일 종가
  timestamp?: string | number;
  logo?: string;
}

export type Currency = 'USD' | 'KRW';

export interface Candle {
  /**
   * 자산 타입 (from Alpaca's 'a')
   */
  assetType: AssetType;

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
  vwap?: number;

  /**
   * 통화 (from Alpaca's 'c')
   */
  currency: Currency;

  change?: number;
  changePercentage?: number;
}

export interface Trade {
  id: string;
  timestamp: number;
  price: number;
  change: number;
  changePercentage: number;
  volume: number;
  symbol: string;
  assetType: AssetType;
  currency: Currency;
  side: 'buy' | 'sell';
}
