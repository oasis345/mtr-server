import { AssetType } from '@/financial/types';
import { Inject, Injectable } from '@nestjs/common';
import { MarketPayload } from './dto/market.subscription.dto';
import { StreamProvider } from './types/provider.interface';

@Injectable()
export class MarketSubscriptionService {
  protected readonly subscriptions = new Map<string, string[]>(); // 기존 구독 관리 로직은 유지

  constructor(
    @Inject('STREAM_PROVIDER_MAP')
    private readonly providerMap: Map<AssetType, StreamProvider>,
  ) {}

  private prepare = (payload: MarketPayload) => {
    const { assetType, channel: requestedChannel, symbols } = payload;
    const provider = this.providerMap.get(assetType);
    return { provider, channel: `${assetType}:${requestedChannel}`, symbols };
  };

  public subscribe(clientId: string, payload: MarketPayload): string {
    const { provider, channel, symbols } = this.prepare(payload);

    // ... 기존 구독자 추가 로직 ...
    const subscribers = this.subscriptions.get(channel);
    if (!subscribers) {
      this.subscriptions.set(channel, [clientId]);
      // 2. 첫 구독자일 경우, 찾은 Provider에게 실제 구독을 요청합니다.
      if (symbols && symbols.length > 0) {
        provider.subscribe(symbols);
      }
    } else if (!subscribers.includes(clientId)) {
      subscribers.push(clientId);
    }

    return channel;
  }

  public unsubscribe(clientId: string, payload: MarketPayload): string {
    const { channel } = this.prepare(payload);

    const subscribers = this.subscriptions.get(channel);
    if (subscribers) {
      const index = subscribers.indexOf(clientId);
      if (index !== -1) {
        subscribers.splice(index, 1);
      }
    }

    return channel;
  }
}
