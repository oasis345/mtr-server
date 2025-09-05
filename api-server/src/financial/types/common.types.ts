export enum AssetType {
  STOCK = 'stocks',
  CRYPTO = 'crypto',
}

export enum MarketDataType {
  ASSETS = 'assets',
  MOST_ACTIVE = 'mostActive',
  GAINERS = 'gainers',
  LOSERS = 'losers',
}

// ✅ 거래소 타입 (주식 + 코인)
export enum FINANCIAL_PROVIDERS {
  FMP = 'FMP',
  YAHOO = 'YAHOO',
  BLOOMBERG = 'BLOOMBERG',
  ALPACA = 'ALPACA',
}

// ✅ 범용 쿼리 파라미터
export interface AssetQueryParams {
  assetType: AssetType; // 주식, 코인
  dataType: MarketDataType; // 시장 데이터 타입
  symbols?: string[]; // 여러 심볼 조회용
  limit?: number; // 제한
  orderBy?: string; // 정렬 순서
}

// ✅ 범용 자산 인터페이스
export interface Asset {
  symbol: string;
  price: number;
  volume: number;
  name?: string;
  change?: number;
  changesPercentage?: number;
  exchange?: string;
  exchangeShortName?: string;
  currency?: string; // USD, KRW, BTC 등
  assetType: AssetType;
  timestamp?: Date;
}
