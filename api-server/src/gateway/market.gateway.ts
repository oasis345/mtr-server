import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SubscriptionService } from './subscription.service';
import { MarketSubscription } from './subscription/market.subscription';

@WebSocketGateway({ namespace: '/market', cors: { origin: '*' } })
export class MarketGateway {
  @WebSocketServer()
  io: Server;

  private readonly logger = new Logger(MarketGateway.name);
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @UsePipes(new ValidationPipe())
  @SubscribeMessage('market-subscription')
  async handleSubscription(@ConnectedSocket() client: Socket, @MessageBody() body: MarketSubscription): Promise<any> {
    const { action, payload } = body;

    const channel = this.subscriptionService.subscribe(client.id, payload.channel);

    if (action === 'subscribe') {
      await client.join(channel);
      return { event: 'subscribed', channel };
    }

    if (action === 'unsubscribe') {
      await client.leave(channel);
      return { event: 'unsubscribed', channel };
    }
  }

  @OnEvent('marketData.update')
  handlePublicMarketDataUpdate(payload: { channel: string; data: any }) {
    this.io.to(payload.channel).emit('update', payload);
  }

  @OnEvent('marketData.symbol.update')
  handlePrivateMarketDataUpdate(payload: { symbol: string; data: any }) {
    this.io.to(payload.symbol).emit('update', payload);
  }
}
