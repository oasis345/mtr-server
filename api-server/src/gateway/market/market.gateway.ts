import { OnEvent } from '@nestjs/event-emitter';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MarketSubscription } from './dto/market.subscription.dto';
import { MarketSubscriptionService } from './market.subsciption.service';

@WebSocketGateway({
  namespace: '/market',
  cors: { origin: '*' },
  transports: ['websocket'],
})
export class MarketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly subscriptionService: MarketSubscriptionService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe-market')
  async handleSubscription(@ConnectedSocket() client: Socket, @MessageBody() body: MarketSubscription): Promise<any> {
    const { payload } = body;
    const channel = await this.subscriptionService.subscribe(client.id, payload);

    await client.join(channel);
    console.log(`Client ${client.id} joined channel: ${channel}`);
    return { event: 'subscribed', channel };
  }

  @SubscribeMessage('unsubscribe-market')
  async handleUnsubscription(@ConnectedSocket() client: Socket, @MessageBody() body: MarketSubscription): Promise<any> {
    const { payload } = body;
    const channel = await this.subscriptionService.subscribe(client.id, payload);

    await client.leave(channel);
    console.log(`Client ${client.id} left channel: ${channel}`);
    return { event: 'unsubscribed', channel };
  }

  @OnEvent('marketData.update')
  publishChannel(params: { channel: string; data: any }) {
    console.log(`Publishing to channel ${params.channel}:`, params.data, 'items');
    this.server.to(params.channel).emit('market-data', params.data);
  }
}
