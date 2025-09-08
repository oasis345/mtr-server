import { Asset, AssetType } from '@/financial/types';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter } from 'events';
import type { StreamProvider } from '../../types/provider.interface';
import { AlpacaStreamClient } from './alpaca.stream.client';

@Injectable()
export class AlpacaStockStreamProvider implements StreamProvider, OnModuleInit {
  public readonly assetType = AssetType.STOCK;
  private readonly logger = new Logger(AlpacaStockStreamProvider.name);
  private readonly streamClient: AlpacaStreamClient;
  private readonly alpacaEvents = new EventEmitter();

  constructor(private readonly configService: ConfigService) {
    // 🎯 주식 스트림 URL로 클라이언트 인스턴스 생성
    const stockStreamUrl = 'wss://stream.data.alpaca.markets/v2/iex';
    this.streamClient = new AlpacaStreamClient(configService, stockStreamUrl);
  }

  onModuleInit() {
    this.streamClient.connect();
    this.setupListeners();
  }

  private setupListeners(): void {
    this.streamClient.on('message', (message: any) => {
      // 🎯 인증 성공/실패 로그 추가
      if (message.T === 'success' && message.msg === 'authenticated') {
        this.logger.log('✅ Alpaca stream authenticated successfully.');
      }

      if (message.T === 'error') {
        this.logger.error(`❌ Alpaca Error: ${message.msg} (code: ${message.code})`);
      }

      // 데이터 처리
      if (message.T === 't') {
        // Trades
        console.log(message);
        const asset = this.normalizeToAsset(message);
        this.alpacaEvents.emit('data', asset); // 내부 이벤트만 발행
      }

      if (message.T === 'subscription') {
        this.logger.log(`✅ Alpaca stream subscribed to ${message.S}`);
      }
    });

    this.streamClient.on('close', () => this.logger.warn('Alpaca stream closed.'));
    this.streamClient.on('error', error => this.logger.error('Alpaca stream error:', error));
  }

  public normalizeToAsset(trade: any): Asset {
    return {
      assetType: AssetType.STOCK,
      symbol: trade.S,
      price: trade.p,
      volume: trade.s,
      timestamp: new Date(trade.t),
    };
  }

  public subscribe(symbols: string[]): void {
    this.logger.log(`Subscribing to stock data: [${symbols.join(', ')}]`);
    this.streamClient.send(
      JSON.stringify({
        action: 'subscribe',
        trades: symbols,
        quotes: symbols, // 호가 정보도 구독
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

  onData(handler: (asset: Asset) => void): void {
    this.alpacaEvents.on('data', handler);
  }

  offData(handler: (asset: Asset) => void): void {
    this.alpacaEvents.off('data', handler);
  }
}
