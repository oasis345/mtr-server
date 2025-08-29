export enum AssetType {
  STOCK = 'stock',
  CRYPTO = 'crypto',
}

export enum MarketDataType {
  MARKET_CAP = 'marketCap',
  VOLUME = 'volume',
  GAINERS = 'gainers',
  LOSERS = 'losers',
  PRICE = 'price',
}

// ✅ 거래소 타입 (주식 + 코인)
export enum FINANCIAL_PROVIDERS {
  FMP = 'FMP',
  YAHOO = 'YAHOO',
  BLOOMBERG = 'BLOOMBERG',
}

// ✅ 범용 쿼리 파라미터
export interface AssetQueryParams {
  assetType: AssetType; // 주식, 코인
  dataType: MarketDataType; // 시장 데이터 타입
  symbol?: string; // 특정 심볼 조회용
  limit?: number; // 제한
  orderBy?: string; // 정렬 순서
}

// ✅ 범용 자산 인터페이스
export interface Asset {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changesPercentage: number;
  volume: number;
  marketCap?: number;
  exchange?: string;
  exchangeShortName?: string;
  currency?: string; // USD, KRW, BTC 등
  assetType: AssetType;
}
