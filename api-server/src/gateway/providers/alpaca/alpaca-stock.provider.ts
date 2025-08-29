import { AssetType } from '@/financial/types';
import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';
import { StreamProvider } from '../provider.interface';
import { AlpacaClient } from './alpaca.client';

@Injectable()
export class AlpacaStreamProvider extends EventEmitter implements StreamProvider {
  assetType: AssetType = AssetType.STOCK;
  private socket: any;

  constructor(private readonly alpacaClient: AlpacaClient) {
    super();
    this.socket = this.alpacaClient.stockStream;
  }

  connect() {
    this.alpacaClient.data_ws.connect();
  }

  subscribe(symbols: string[]): void {
    this.socket.subscribe(symbols);
  }
  unsubscribe(symbols: string[]): void {
    throw new Error('Method not implemented.');
  }
}
