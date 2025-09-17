import { Asset, AssetType } from '@/common/types/asset.types';
import { AssetQueryParams, MarketDataType } from './common.types';

export type CryptoExchange = 'BINANCE' | 'COINBASE' | 'UPBIT' | 'BITHUMB';

export interface Crypto extends Asset {
  assetType: AssetType.CRYPTO;
  rank?: number;
  circulating_supply?: number;
  total_supply?: number;
  max_supply?: number;
  dominance?: number;
}

export interface CryptoQueryParams extends AssetQueryParams {
  assetType: AssetType.CRYPTO;
  dataType: MarketDataType;
  exchange?: CryptoExchange;
}
