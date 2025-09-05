import { Asset, AssetType } from '@/financial/types';
import { AlpacaStreamClient } from '@alpacahq/alpaca-trade-api/dist/resources/websockets';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';
import { StreamProvider } from '../../types/provider.interface';
import { AlpacaClient } from './alpaca.client';

// Alpaca API가 반환하는 raw trade 데이터의 타입 (필요한 것만 정의)
interface AlpacaRawTrade {
  Symbol: string;
  Price: number;
  Size: number;
  Timestamp: string;
}

@Injectable()
export class AlpacaStockStreamProvider extends EventEmitter implements StreamProvider {
  public readonly assetType = AssetType.STOCK;
  private readonly logger = new Logger(AlpacaStockStreamProvider.name);
  private socket: AlpacaStreamClient;

  constructor(private readonly alpacaClient: AlpacaClient) {
    super();
    this.socket = this.alpacaClient.stockStream;
    this.connectAndSetupListeners();
  }

  /**
   * Alpaca의 raw 데이터를 우리 시스템의 표준 'Stock' 타입으로 변환합니다.
   */
  public normalizeToAsset(trade: AlpacaRawTrade): Asset {
    return {
      assetType: AssetType.STOCK,
      symbol: trade.Symbol,
      price: trade.Price,
      // 참고: trade.Size는 해당 거래의 체결량이며, 일일 총 거래량과는 다릅니다.
      volume: trade.Size,
      timestamp: new Date(trade.Timestamp),
    };
  }

  private connectAndSetupListeners(): void {
    this.socket.onConnect(() => {
      this.logger.log('Connected to Alpaca Stock Stream.');
    });

    this.socket.onDisconnect(() => {
      this.logger.warn('Disconnected from Alpaca Stock Stream.');
    });

    // ✨ [수정] onStockTrade -> onStockTrades (복수형)
    this.socket.onStockTrades((trade: AlpacaRawTrade) => {
      const standardizedData = this.normalizeToAsset(trade);
      // 'data' 이벤트를 외부로 발행(emit)합니다.
      this.emit('data', standardizedData);
    });

    this.socket.onError(err => {
      this.logger.error('Alpaca Stock Stream Error:', err);
    });

    this.socket.connect();
  }

  public subscribe(symbols: string[]): void {
    this.logger.log(`Subscribing to stock trades: [${symbols.join(', ')}]`);
    // ✨ [수정] subscribeForTrades(symbols) -> subscribe({ trades: symbols })
    this.socket.subscribe({ trades: symbols });
  }

  public unsubscribe(symbols: string[]): void {
    this.logger.log(`Unsubscribing from stock trades: [${symbols.join(', ')}]`);
    // ✨ [수정] unsubscribeFromTrades(symbols) -> unsubscribe({ trades: symbols })
    this.socket.unsubscribe({ trades: symbols });
  }
}
