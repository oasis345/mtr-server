export enum AssetType {
  STOCK = 'stocks',
  CRYPTO = 'crypto',
}

export type Currency = 'USD' | 'KRW';

// ✅ 범용 자산 인터페이스
export interface Asset {
  assetType: AssetType;
  symbol: string;
  name?: string;
  exchange?: string;
  currency?: Currency;
  logo?: string;
}
export type BaseTickerData = {
  price: number;
  change: number;
  changePercentage: number;
  volume?: number;
  timestamp?: number;
  previousClose?: number;
  accTradeVolume?: number;
  accTradePrice?: number;
};

export type TickerData<T extends Asset = Asset> = T & BaseTickerData;

export interface Candle extends Asset {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: string;
  tradeCount?: number;
  change?: number;
  changePercentage?: number;
  candleAccTradePrice?: number;
  candleAccTradeVolume?: number;
}

export interface Trade extends Asset {
  id: string;
  timestamp: number;
  price: number;
  change: number;
  changePercentage: number;
  volume: number;
  side: 'buy' | 'sell';
}

export interface Quote extends Asset {
  ask: number;
  askSize: number;
  askPrice: number;
  askTotalSize: number;
  bid: number;
  bidSize: number;
  bidPrice: number;
  bidTotalSize: number;
  timestamp: number;
}
