import { AlpacaWebSocketStockTradeMessage } from '@/common/types';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, Subject } from 'rxjs';
import WebSocket from 'ws';

@Injectable()
export class AlpacaStreamClient {
  private readonly logger = new Logger(AlpacaStreamClient.name);
  private socket: WebSocket | null = null;
  private readonly apiKey: string;
  private readonly secretKey: string;
  private readonly url: string;
  private readonly messageStream = new Subject<AlpacaWebSocketStockTradeMessage>();

  constructor(
    private readonly configService: ConfigService,
    streamUrl: string,
  ) {
    this.apiKey = this.configService.get<string>('ALPACA_API_KEY');
    this.secretKey = this.configService.get<string>('ALPACA_SECRET_KEY');
    this.url = streamUrl;
  }

  connect(): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) return;
    this.socket = new WebSocket(this.url);

    this.socket.on('open', () => this.authenticate());
    this.socket.on('message', (data: WebSocket.Data) => {
      try {
        const messages = JSON.parse(data.toString());
        console.log(messages);
        if (Array.isArray(messages)) {
          messages.forEach(message => this.messageStream.next(message));
        } else {
          this.messageStream.next(messages);
        }

        if (messages.T === 'error') {
          this.logger.error('Alpaca Stream Client WebSocket error:', messages);
        }
      } catch (error) {
        this.logger.error('Alpaca Stream Client Failed to parse WebSocket message:', data.toString());
      }
    });

    this.socket.on('close', () => {
      this.logger.warn('WebSocket connection closed. Reconnecting in 5 seconds...');
      setTimeout(() => this.connect(), 5000);
    });

    this.socket.on('error', error => {
      this.logger.error('WebSocket error:', error);
    });
  }

  getMessageStream(): Observable<AlpacaWebSocketStockTradeMessage> {
    return this.messageStream.asObservable();
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  send(message: string): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(message);
    }
  }

  private authenticate(): void {
    this.send(
      JSON.stringify({
        action: 'auth',
        key: this.apiKey,
        secret: this.secretKey,
      }),
    );
  }
}
