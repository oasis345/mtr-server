import { Injectable } from '@nestjs/common';
import { StreamProvider } from './providers/provider.interface';

@Injectable()
export abstract class SubscriptionService {
  protected readonly subscriptions = new Map<string, string[]>();
  constructor(private readonly streamProvider: StreamProvider) {}

  abstract subscribe(clientId: string, requestChannel: string): string;
  abstract unsubscribe(clientId: string, requestChannel: string): void;

  // subscribe(clientId: string, requestChannel: string) {
  //   const channel = this.subscriptions.get(requestChannel);

  //   if (!channel) {
  //     this.subscriptions.set(requestChannel, [clientId]);
  //   } else {
  //     if (!channel.includes(clientId)) {
  //       channel.push(clientId);
  //     }
  //   }

  //   return requestChannel;
  // }
  // unsubscribe(clientId: string, requestChannel: string) {
  //   const channel = this.subscriptions.get(requestChannel);
  //   if (channel) {
  //     const index = channel.indexOf(clientId);
  //     if (index !== -1) {
  //       channel.splice(index, 1);
  //     }
  //   }
  // }
}
