import { AssetType, Candle, ChartTimeframe, Trade } from '@/common/types';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { filter, map, merge, Observable, Subject } from 'rxjs';
import { WebSocket } from 'ws';
import {
  ChannelDataType,
  MarketStreamData,
  MarketStreamProvider,
  UpbitCandleMessage,
  UpbitTickerMessage,
  UpbitTradeMessage,
  UpbitWebSocketMessage,
} from '../../types';

@Injectable()
export class UpbitCryptoStreamProvider implements MarketStreamProvider, OnModuleInit {
  public readonly assetType = AssetType.CRYPTO;
  private readonly UPBIT_SOCKET_URL = 'wss://api.upbit.com/websocket/v1';
  private readonly logger = new Logger(UpbitCryptoStreamProvider.name);
  private streamClient: WebSocket;
  private dataStream = new Subject<MarketStreamData>();
  private rawMessageStream = new Subject<UpbitWebSocketMessage>();
  private subscribedSymbols = new Set<string>();
  private activeDataTypes = new Set<ChannelDataType>();

  onModuleInit() {
    this.connectWebSocket();
    const ticker$ = this.rawMessageStream.pipe(
      filter((message): message is UpbitTickerMessage => message.type === 'ticker'),
      map(message => this.normalizeTickerToMarketData(message)),
    );
    const trade$ = this.rawMessageStream.pipe(
      filter((message): message is UpbitTradeMessage => message.type === 'trade'),
      map(message => this.normalizeTradeToMarketData(message)),
    );
    const candle$ = this.rawMessageStream.pipe(
      filter((message): message is UpbitCandleMessage => {
        return message.type.includes('candle');
      }),
      map(message => this.normalizeCandleToMarketData(message)),
    );
    merge(ticker$, trade$, candle$).subscribe(marketData => {
      this.dataStream.next(marketData);
    });
  }

  public subscribe(symbols: string[], dataTypes: ChannelDataType[], timeFrame: ChartTimeframe): void {
    symbols.forEach(symbol => this.subscribedSymbols.add(symbol));
    dataTypes.forEach(dataType => this.activeDataTypes.add(dataType));
    this.logger.log(
      `Subscribing to crypto data - Total symbols: ${this.subscribedSymbols.size}, Data types: [${Array.from(this.activeDataTypes).join(', ')}]`,
    );
    const allSymbols = Array.from(this.subscribedSymbols);
    const allDataTypes = Array.from(this.activeDataTypes);
    this.sendSubscriptionMessage(allSymbols, allDataTypes, timeFrame);
  }

  public unsubscribe(symbols: string[], dataTypes: ChannelDataType[], timeFrame: ChartTimeframe): void {
    this.logger.log(`Unsubscribing from crypto data: [${symbols.join(', ')}] for [${dataTypes.join(', ')}]`);
    symbols.forEach(symbol => this.subscribedSymbols.delete(symbol));
    if (this.subscribedSymbols.size === 0) {
      this.activeDataTypes.clear();
      return;
    }
    const allSymbols = Array.from(this.subscribedSymbols);
    const allDataTypes = Array.from(this.activeDataTypes);
    this.sendSubscriptionMessage(allSymbols, allDataTypes, timeFrame);
  }

  getDataStream(): Observable<MarketStreamData> {
    return this.dataStream.asObservable();
  }

  private connectWebSocket() {
    this.streamClient = new WebSocket(this.UPBIT_SOCKET_URL);
    this.streamClient.on('open', () => {
      this.logger.log('Upbit WebSocket connected');
      this.resubscribeAll();
    });
    this.streamClient.on('message', (data: Buffer) => {
      const messages = JSON.parse(data.toString()) as UpbitWebSocketMessage | UpbitWebSocketMessage[];
      if (Array.isArray(messages)) {
        messages.forEach(message => this.rawMessageStream.next(message));
      } else {
        this.rawMessageStream.next(messages);
      }
    });
    this.streamClient.on('error', (err: Error) => {
      this.logger.error('Upbit WebSocket error', err);
    });
    this.streamClient.on('close', (code: number, reason: Buffer) => {
      this.logger.log('Upbit WebSocket closed', code, reason.toString());
      this.reconnectWebSocket();
    });
  }

  private reconnectWebSocket() {
    this.logger.warn('Reconnecting WebSocket in 5 seconds...');
    setTimeout(() => this.connectWebSocket(), 5000);
  }

  private resubscribeAll(): void {
    if (this.subscribedSymbols.size === 0 || this.activeDataTypes.size === 0) {
      return;
    }
    const allSymbols = Array.from(this.subscribedSymbols);
    const allDataTypes = Array.from(this.activeDataTypes);
    this.sendSubscriptionMessage(allSymbols, allDataTypes);
  }

  private sendSubscriptionMessage(symbols: string[], dataTypes: ChannelDataType[], timeFrame?: ChartTimeframe): void {
    const formattedSymbols = symbols.map(symbol => `KRW-${symbol}`);
    const subscribePayload: Array<Record<string, unknown>> = [{ ticket: 'upbit-stream' }];
    if (dataTypes.includes(ChannelDataType.TICKER)) {
      subscribePayload.push({ type: 'ticker', codes: formattedSymbols });
    }
    if (dataTypes.includes(ChannelDataType.TRADE)) {
      subscribePayload.push({ type: 'trade', codes: formattedSymbols });
    }
    if (dataTypes.includes(ChannelDataType.CANDLE) && timeFrame) {
      const timeFrameMap = {
        [ChartTimeframe.ONE_MINUTE]: 'candle.1m',
        [ChartTimeframe.THREE_MINUTES]: 'candle.3m',
        [ChartTimeframe.FIVE_MINUTES]: 'candle.5m',
        [ChartTimeframe.TEN_MINUTES]: 'candle.10m',
        [ChartTimeframe.FIFTEEN_MINUTES]: 'candle.15m',
        [ChartTimeframe.THIRTY_MINUTES]: 'candle.30m',
        [ChartTimeframe.ONE_HOUR]: 'candle.60m',
      };

      if (timeFrameMap[timeFrame]) subscribePayload.push({ type: timeFrameMap[timeFrame], codes: formattedSymbols });
    }
    if (subscribePayload.length > 1) {
      this.streamClient.send(JSON.stringify(subscribePayload));
      this.logger.log(`Sent subscription: [${symbols.join(', ')}] for [${dataTypes.join(', ')}]`);
    }
  }

  private normalizeTickerToMarketData(ticker: UpbitTickerMessage): MarketStreamData {
    return {
      dataType: ChannelDataType.TICKER,
      payload: {
        assetType: AssetType.CRYPTO,
        symbol: ticker.code.replace('KRW-', ''),
        price: ticker.trade_price,
        volume: ticker.acc_trade_volume_24h,
        timestamp: ticker.trade_timestamp,
        change: ticker.change_price,
        changePercentage: ticker.signed_change_rate,
        previousClose: ticker.prev_closing_price,
        currency: 'KRW',
      },
    };
  }

  private normalizeTradeToMarketData(trade: UpbitTradeMessage): MarketStreamData {
    const changePercentage = trade.prev_closing_price
      ? (trade.trade_price - trade.prev_closing_price) / trade.prev_closing_price
      : 0; // 또는 null, 적절한 기본값
    const tradeData: Trade = {
      id: trade.sequential_id.toString(),
      symbol: trade.code.replace('KRW-', ''),
      timestamp: trade.trade_timestamp,
      price: trade.trade_price,
      change: trade.change_price,
      volume: trade.trade_volume,
      changePercentage,
      assetType: AssetType.CRYPTO,
      currency: 'KRW',
      side: trade.ask_bid === 'ASK' ? 'sell' : 'buy',
    };

    return {
      dataType: ChannelDataType.TRADE,
      payload: tradeData,
    };
  }

  private normalizeCandleToMarketData(upbitCandle: UpbitCandleMessage): MarketStreamData {
    const {
      type,
      stream_type,
      low_price,
      high_price,
      opening_price,
      candle_acc_trade_price,
      candle_acc_trade_volume,
      candle_date_time_utc,
      timestamp,
      trade_price,
      code,
    } = upbitCandle;
    const candle: Candle = {
      assetType: AssetType.CRYPTO,
      symbol: code.replace('KRW-', ''),
      high: high_price,
      low: low_price,
      open: opening_price,
      close: trade_price,
      volume: candle_acc_trade_volume,
      vwap: candle_acc_trade_price,
      timestamp: candle_date_time_utc,
      currency: 'KRW',
    };
    return {
      dataType: ChannelDataType.CANDLE,
      payload: candle,
    };
  }
}
