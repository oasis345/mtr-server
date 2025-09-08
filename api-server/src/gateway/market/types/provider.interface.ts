import { Asset, AssetType } from '@/financial/types';

export enum MarketStreamProviders {
  ALPACA = 'ALPACA',
  UPBIT = 'UPBIT',
}

export interface StreamProvider {
  assetType: AssetType;
  subscribe(symbols: string[]): void;
  unsubscribe(symbols: string[]): void;
  normalizeToAsset(data: any): Asset;

  onData(handler: (asset: Asset) => void): void;
  offData(handler: (asset: Asset) => void): void;
}
