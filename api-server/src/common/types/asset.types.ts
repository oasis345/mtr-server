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
  timestamp?: Date;
  logo?: string;
}
