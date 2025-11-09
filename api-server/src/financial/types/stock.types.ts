import { Asset, AssetType } from '@/common/types/asset.types';
import { AssetQueryParams, MarketDataType } from './common.types';

export type EnableExchangeStockCountry = 'KR' | 'US';
export type KoreanExchange = 'KOSPI' | 'KOSDAQ';
export type USExchange = 'NASDAQ' | 'NYSE' | 'AMEX';
export type StockExchange = KoreanExchange | USExchange;
export type StockMarketStatus = 'REGULAR' | 'PRE' | 'AFTER' | 'CLOSE';

// ✅ API 파라미터 타입
export interface StockQueryParams extends AssetQueryParams {
  country: EnableExchangeStockCountry;
  dataType: MarketDataType;
  exchange?: StockExchange;
}

export interface Stock extends Asset {
  assetType: AssetType.STOCK;
  sector?: string;
  industry?: string;
  eps?: number;
  pe?: number;
  beta?: number;
}
