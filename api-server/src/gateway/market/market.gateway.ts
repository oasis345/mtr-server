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

  constructor(private readonly subscriptionService: MarketSubscriptionService) {
    // 채널 브로드캐스트 데이터 전송
    this.subscriptionService.getChannelBroadcasts().subscribe(({ channel, data }) => {
      this.server.to(channel).emit('market-data', data);
    });
  }

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
    const channel = this.subscriptionService.unsubscribe(client.id, payload);

    await client.leave(channel);
    console.log(`Client ${client.id} left channel: ${channel}`);
    return { event: 'unsubscribed', channel };
  }
}
