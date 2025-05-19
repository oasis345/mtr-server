import { RedisService, RedisTTL } from '@/redis/redis.service';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios from 'axios';
import { BaseMarketService } from '../market.service';
import { WebSocket } from 'ws';

interface UpbitMarketInfo {
  market: string;
  korean_name: string;
  english_name: string;
}

export interface UpbitTickerResponse {
  type: string;
  code: string;
  trade_price: number;
  signed_change_rate: number;
  timestamp: number;
  acc_trade_price_24h: number;
}

@Injectable()
export class UpbitService extends BaseMarketService implements OnModuleInit {
  private readonly UPBIT_SOCKET_URL = 'wss://api.upbit.com/websocket/v1';
  private readonly UPBIT_MARKET_URL = 'https://api.upbit.com/v1/market/all';
  private upbitClient: WebSocket;
  private marketData: UpbitMarketInfo[] = [];
  private krMarketData: UpbitMarketInfo[] = [];
  private readonly logger = new Logger(UpbitService.name);
  private isReady = false;

  constructor(private readonly redisService: RedisService) {
    super();
  }

  async onModuleInit() {
    await this.fetchMarketData();
    this.connectWebSocket();
  }

  private connectWebSocket() {
    this.upbitClient = new WebSocket(this.UPBIT_SOCKET_URL);

    this.upbitClient.on('open', () => this.handleOpen());
    this.upbitClient.on('message', (data: Buffer) => this.handleMessage(data));
    this.upbitClient.on('error', (err: Error) => this.handleError(err));
    this.upbitClient.on('close', (code: number, reason: Buffer) =>
      this.handleClose(code, reason),
    );
  }

  // open 이벤트 처리
  private handleOpen() {
    try {
      this.logger.log('Upbit Stream was connected.');
      const subscribePayload = [
        { ticket: 'upbit-stream' },
        { type: 'ticker', codes: this.krMarketData.map((mk) => mk.market) },
      ];
      this.upbitClient.send(JSON.stringify(subscribePayload));
    } catch (err) {
      console.error('Failed to connect to Upbit WebSocket', err);
      this.reconnectWebSocket();
    }
  }

  // message 이벤트 처리
  public async handleMessage(data: Buffer) {
    try {
      const tickerData = JSON.parse(data.toString()) as UpbitTickerResponse;
      const [baseToken, quoteToken] = tickerData.code.split('-');
      const key = this.createTickerKey('upbit', baseToken, quoteToken);
      await this.redisService.set(
        key,
        JSON.stringify(tickerData),
        RedisTTL.DEFAULT,
      );

      if (!this.isReady) {
        this.isReady = true;
      }

      this.logger.log('Upbit Ticker Was Inserted To Redis.');
    } catch (err) {
      console.error('Failed to handle message', err);
    }
  }

  // error 이벤트 처리
  private handleError(err: Error) {
    console.error('WebSocket error:', err);
  }

  // close 이벤트 처리
  private handleClose(code: number, reason: Buffer) {
    console.warn(
      `WebSocket closed. Code: ${code}, Reason: ${reason.toString()}`,
    );

    this.reconnectWebSocket();
  }

  private reconnectWebSocket() {
    console.warn('Reconnecting WebSocket in 5 seconds...');
    setTimeout(() => this.connectWebSocket(), 5000);
  }

  private async fetchMarketData() {
    try {
      const response = await axios.get<UpbitMarketInfo[]>(
        this.UPBIT_MARKET_URL,
      );
      this.marketData = response.data;
      this.krMarketData = response.data.filter((m) =>
        m.market.startsWith('KRW-'),
      );
    } catch (err) {
      console.error('Failed to fetch marketData', err);
    }
  }
}
