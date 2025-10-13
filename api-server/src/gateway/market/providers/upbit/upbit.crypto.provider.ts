import { Asset, AssetType } from '@/common/types';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Observable, Subject, filter, map } from 'rxjs';
import WebSocket from 'ws';
import type { MarketStreamProvider, UpbitWebSocketTickerMessage } from '../../types';

@Injectable()
export class UpbitCryptoStreamProvider implements MarketStreamProvider, OnModuleInit {
  private readonly UPBIT_SOCKET_URL = 'wss://api.upbit.com/websocket/v1';
  public readonly assetType = AssetType.CRYPTO;
  private readonly logger = new Logger(UpbitCryptoStreamProvider.name);
  private streamClient: WebSocket | null = null;
  private dataStream = new Subject<Asset>();
  private tickerStream = new Subject<UpbitWebSocketTickerMessage>();

  onModuleInit() {
    this.streamClient = new WebSocket(this.UPBIT_SOCKET_URL);

    this.tickerStream
      .asObservable()
      .pipe(
        filter(message => message.type === 'ticker'),
        map(message => this.normalizeToAsset(message)),
      )
      .subscribe(asset => {
        this.dataStream.next(asset);
      });

    this.streamClient.on('open', () => {
      this.logger.log('Upbit WebSocket connected');
    });
    this.streamClient.on('message', (data: Buffer) => {
      const messages = JSON.parse(data.toString());
      if (Array.isArray(messages)) {
        messages.forEach(message => this.tickerStream.next(message));
      } else {
        this.tickerStream.next(messages);
      }
    });
    this.streamClient.on('error', (err: Error) => {
      this.logger.error('Upbit WebSocket error', err);
    });
    this.streamClient.on('close', (code: number, reason: Buffer) => {
      this.logger.log('Upbit WebSocket closed', code, reason);
    });
  }

  public normalizeToAsset(trade: UpbitWebSocketTickerMessage): Asset {
    return {
      assetType: AssetType.CRYPTO,
      symbol: trade.code.replace('KRW-', ''),
      price: trade.trade_price,
      volume: trade.acc_trade_volume_24h,
      timestamp: trade.timestamp ? new Date(trade.timestamp) : new Date(),
    };
  }

  public subscribe(symbols: string[]): void {
    this.logger.log(`Subscribing to stock data: [${symbols.join(', ')}]`);
    const subscribePayload = [
      { ticket: 'upbit-stream' },
      { type: 'ticker', codes: symbols.map(symbol => `KRW-${symbol}`) },
    ];
    this.streamClient.send(JSON.stringify(subscribePayload));
  }

  public unsubscribe(symbols: string[]): void {
    this.logger.log(`Unsubscribing from stock data: [${symbols.join(', ')}]`);
    const unsubscribePayload = [
      { ticket: 'upbit-stream' },
      { type: 'ticker', codes: symbols.map(symbol => `KRW-${symbol}`) },
    ];
    this.streamClient.send(JSON.stringify(unsubscribePayload));
  }

  getDataStream(): Observable<Asset> {
    return this.dataStream.asObservable();
  }
}
