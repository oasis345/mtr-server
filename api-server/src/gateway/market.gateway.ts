import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RedisService } from '@/redis/redis.service';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  },
  transports: ['websocket'],
  path: '/socket.io/',
  pingInterval: 1000,
  pingTimeout: 3000,
  maxHttpBufferSize: 1e6,
})
export class MarketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private server: Server;
  private connectedClients: Set<string> = new Set();
  private readonly logger = new Logger(MarketGateway.name);

  constructor(private readonly redisService: RedisService) {}

  async handleConnection(client: Socket) {
    this.connectedClients.add(client.id);
    this.logger.log(`🔌 Client connected: ${client.id}`);

    await this.sendAllTickers(client);
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.logger.warn(`❌ Client disconnected: ${client.id}`);
  }

  async sendAllTickers(client: Socket) {
    try {
      const data = await this.redisService.get('ticker-upbit-*');

      if (data) {
        client.emit('ticker', JSON.parse(data));
        this.logger.debug(`📤 Sent tickers to client ${client.id}`);
      } else {
        client.emit('ticker', { message: '데이터 없음' });
        this.logger.warn(`⚠️ Not found Tickers`);
      }
    } catch (error) {
      this.logger.error(
        `🔥 Error sending ticker to client: ${error.message}`,
        error,
      );
      client.emit('ticker', { message: '티커 조회 오류 발생' });
    }
  }

  // async sendTickerToClient(client: any, key: string) {
  //   try {
  //     const data = await this.redisService.get(key);

  //     if (data) {
  //       client.emit('ticker', JSON.parse(data));
  //       this.logger.debug(
  //         `📤 Sent ticker to client ${client.id} | key: ${key}`,
  //       );
  //     } else {
  //       client.emit('ticker', { message: '데이터 없음' });
  //       this.logger.warn(`⚠️ No data found for key: ${key}`);
  //     }
  //   } catch (error) {
  //     this.logger.error(
  //       `🔥 Error sending ticker to client: ${error.message}`,
  //       error,
  //     );
  //     client.emit('ticker', { message: '티커 조회 오류 발생' });
  //   }
  // }
}
