import { AlpacaWebSocketStockTradeMessage, Asset, AssetType } from '@/common/types';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, Subject, filter, map } from 'rxjs';
import type { MarketStreamProvider } from '../../types/provider.interface';
import { AlpacaStreamClient } from './alpaca.stream.client';

@Injectable()
export class AlpacaStockStreamProvider implements MarketStreamProvider, OnModuleInit {
  public readonly assetType = AssetType.STOCK;
  private readonly logger = new Logger(AlpacaStockStreamProvider.name);
  private readonly streamClient: AlpacaStreamClient;
  private readonly dataStream = new Subject<Asset>();

  constructor(private readonly configService: ConfigService) {
    const stockStreamUrl = 'wss://stream.data.alpaca.markets/v2/iex';
    this.streamClient = new AlpacaStreamClient(configService, stockStreamUrl);
  }

  onModuleInit() {
    this.streamClient.connect();
    this.streamClient
      .getMessageStream()
      .pipe(
        filter(message => message.T === 't'), // 거래 데이터만
        map(message => this.normalizeToAsset(message)),
      )
      .subscribe(asset => {
        this.dataStream.next(asset);
      });
  }

  public normalizeToAsset(trade: AlpacaWebSocketStockTradeMessage): Asset {
    return {
      assetType: AssetType.STOCK,
      symbol: trade.S,
      price: trade.p,
      volume: trade.s,
      timestamp: trade.t ? new Date(trade.t) : new Date(),
    };
  }

  public subscribe(symbols: string[]): void {
    this.logger.log(`Subscribing to stock data: [${symbols.join(', ')}]`);
    this.streamClient.send(
      JSON.stringify({
        action: 'subscribe',
        trades: symbols,
        quotes: symbols,
      }),
    );
  }

  public unsubscribe(symbols: string[]): void {
    this.logger.log(`Unsubscribing from stock data: [${symbols.join(', ')}]`);
    this.streamClient.send(
      JSON.stringify({
        action: 'unsubscribe',
        trades: symbols,
        quotes: symbols,
      }),
    );
  }

  getDataStream(): Observable<Asset> {
    return this.dataStream.asObservable();
  }
}
