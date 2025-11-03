import { AssetType } from '@/common/types/asset.types';
import { Observable } from 'rxjs';
import { ChannelDataType, MarketStreamData } from './';
import { ChartTimeframe } from '@/common/types';

export enum MarketStreamProviders {
  ALPACA = 'ALPACA',
  UPBIT = 'UPBIT',
}

export interface MarketStreamProvider {
  assetType: AssetType;
  subscribe(symbols: string[], dataTypes: ChannelDataType[], timeframe?: ChartTimeframe): void;
  unsubscribe(symbols: string[], dataTypes: ChannelDataType[], timeframe?: ChartTimeframe): void;
  getDataStream(): Observable<MarketStreamData>;
}
