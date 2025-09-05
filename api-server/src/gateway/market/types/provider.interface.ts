import { Asset, AssetType } from '@/financial/types';
import { EventEmitter } from 'events';

export enum MarketStreamProviders {
  ALPACA = 'ALPACA',
  UPBIT = 'UPBIT',
}

export interface StreamProvider extends EventEmitter {
  assetType: AssetType;
  subscribe(symbols: string[]): void;
  unsubscribe(symbols: string[]): void;
  normalizeToAsset(data: any): Asset;
}
