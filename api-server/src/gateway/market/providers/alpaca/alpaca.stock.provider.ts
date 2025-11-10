import { AssetType } from '@/common/types';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { filter, map, merge, Observable, Subject } from 'rxjs';
import type { AlpacaWebSocketStockTradeMessage, MarketStreamProvider } from '../../types';
import { ChannelDataType, MarketStreamData } from '../../types';
import { AlpacaStreamClient } from './alpaca.stream.client';

@Injectable()
export class AlpacaStockStreamProvider implements MarketStreamProvider, OnModuleInit {
  public readonly assetType = AssetType.STOCK;
  private readonly logger = new Logger(AlpacaStockStreamProvider.name);
  private readonly streamClient: AlpacaStreamClient;
  private readonly dataStream = new Subject<MarketStreamData>();

  constructor(private readonly configService: ConfigService) {
    const stockStreamUrl = 'wss://stream.data.alpaca.markets/v2/iex';
    this.streamClient = new AlpacaStreamClient(configService, stockStreamUrl);
  }

  onModuleInit() {
    this.streamClient.connect();
    const rawMessageStream$ = this.streamClient.getMessageStream();

    const trade$ = rawMessageStream$.pipe(
      filter((msg): msg is AlpacaWebSocketStockTradeMessage => msg.T === 't'),
      map(trade => this.normalizeTradeToMarketData(trade)),
    );

    merge(trade$).subscribe(marketData => {
      this.dataStream.next(marketData);
    });
  }

  public subscribe(symbols: string[], dataTypes: ChannelDataType[]): void {
    const subscriptions: { trades?: string[]; quotes?: string[] } = {};

    if (dataTypes.includes(ChannelDataType.TRADE)) {
      subscriptions.trades = symbols;
    }

    if (Object.keys(subscriptions).length > 0) {
      this.logger.log(`Subscribing to Alpaca: ${JSON.stringify(subscriptions)}`);
      this.streamClient.send(
        JSON.stringify({
          action: 'subscribe',
          ...subscriptions,
        }),
      );
    }
  }

  public unsubscribe(symbols: string[], dataTypes: ChannelDataType[]): void {
    const unsubscriptions: { trades?: string[]; quotes?: string[] } = {};

    if (dataTypes.includes(ChannelDataType.TRADE)) {
      unsubscriptions.trades = symbols;
    }
    if (dataTypes.includes(ChannelDataType.TICKER)) {
      unsubscriptions.quotes = symbols;
    }

    if (Object.keys(unsubscriptions).length > 0) {
      this.logger.log(`Unsubscribing from Alpaca: ${JSON.stringify(unsubscriptions)}`);
      this.streamClient.send(
        JSON.stringify({
          action: 'unsubscribe',
          ...unsubscriptions,
        }),
      );
    }
  }

  getDataStream(): Observable<MarketStreamData> {
    return this.dataStream.asObservable();
  }

  private normalizeTradeToMarketData(trade: AlpacaWebSocketStockTradeMessage): MarketStreamData {
    return {
      dataType: ChannelDataType.TRADE,
      payload: {
        id: trade.i.toString(),
        assetType: AssetType.STOCK,
        symbol: trade.S,
        price: trade.p,
        volume: trade.s,
        change: 0,
        changePercentage: 0,
        side: trade.t === 'b' ? 'buy' : 'sell', // TODO alpaca change, pecentage, side
        timestamp: new Date(trade.t).getTime(),
      },
    };
  }
}
