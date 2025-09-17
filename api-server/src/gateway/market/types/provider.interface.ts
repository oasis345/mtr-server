import { Asset, AssetType } from '@/common/types/asset.types';
import { Observable } from 'rxjs';

export enum MarketStreamProviders {
  ALPACA = 'ALPACA',
  UPBIT = 'UPBIT',
}

export interface MarketStreamProvider {
  assetType: AssetType;
  subscribe(symbols: string[]): void;
  unsubscribe(symbols: string[]): void;
  normalizeToAsset(data: any): Asset;
  getDataStream(): Observable<Asset>;
}
