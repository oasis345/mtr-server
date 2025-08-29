import { AssetType } from '@/financial/types';
import { EventEmitter } from 'events';

export interface StreamProvider extends EventEmitter {
  assetType: AssetType;
  subscribe(symbols: string[]): void;
  unsubscribe(symbols: string[]): void;
}
