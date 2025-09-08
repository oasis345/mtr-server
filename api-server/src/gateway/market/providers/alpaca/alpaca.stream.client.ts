import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter } from 'events';
import WebSocket from 'ws';

@Injectable()
export class AlpacaStreamClient extends EventEmitter {
  private readonly logger = new Logger(AlpacaStreamClient.name);
  private socket: WebSocket | null = null;
  private readonly apiKey: string;
  private readonly secretKey: string;
  private readonly url: string;

  constructor(
    private readonly configService: ConfigService,
    // 🎯 URL을 외부에서 주입받도록 변경
    streamUrl: string,
  ) {
    super();
    this.apiKey = this.configService.get<string>('ALPACA_API_KEY');
    this.secretKey = this.configService.get<string>('ALPACA_SECRET_KEY');
    this.url = streamUrl;
  }

  connect(): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) return;
    this.socket = new WebSocket(this.url);

    this.socket.on('open', () => this.authenticate());

    // 🎯 메시지 처리 로직 수정
    this.socket.on('message', (data: WebSocket.Data) => {
      try {
        const messages = JSON.parse(data.toString());

        // 🎯 배열의 각 메시지를 개별적으로 처리
        if (Array.isArray(messages)) {
          messages.forEach(message => this.emit('message', message));
        } else {
          this.emit('message', messages); // 비배열 형식도 대비
        }
      } catch (error) {
        this.logger.error('Failed to parse WebSocket message:', data.toString());
      }
    });

    this.socket.on('close', () => {
      this.emit('close');
      this.logger.warn('WebSocket connection closed. Reconnecting in 5 seconds...');
      setTimeout(() => this.connect(), 5000); // 🎯 5초 후 재연결
    });
    this.socket.on('error', error => this.emit('error', error));
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
