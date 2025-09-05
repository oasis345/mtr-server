import { UsePipes, ValidationPipe } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MarketSubscription } from './dto/market.subscription.dto';
import { MarketSubscriptionService } from './market.subsciption.service';

@WebSocketGateway({ namespace: '/market', cors: { origin: '*' } })
export class MarketGateway {
  @WebSocketServer()
  server: Server;
  constructor(private readonly subscriptionService: MarketSubscriptionService) {}

  @UsePipes(new ValidationPipe())
  @SubscribeMessage('market-subscription')
  async handleSubscription(@ConnectedSocket() client: Socket, @MessageBody() body: MarketSubscription): Promise<any> {
    const { action, payload } = body;
    const channel = this.subscriptionService.subscribe(client.id, payload);

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
  publishChannel(params: { channel: string; data: any }) {
    this.server.to(params.channel).emit('update', params.data);
  }
}
