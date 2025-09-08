import { Asset, AssetType } from '@/financial/types';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cache } from 'cache-manager';
import { MarketPayload } from './dto/market.subscription.dto';
import { StreamProvider } from './types/provider.interface';

@Injectable()
export class MarketSubscriptionService {
  protected readonly subscriptions = new Map<string, string[]>(); // 기존 구독 관리 로직은 유지
  private channelToSymbols = new Map<string, Set<string>>(); // 방송형만

  constructor(
    @Inject('STREAM_PROVIDER_MAP')
    private readonly providerMap: Map<AssetType, StreamProvider>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly events: EventEmitter2,
  ) {
    this.providerMap.forEach(provider => {
      provider.onData((asset: Asset) => {
        // 포함 채널만 찾아서 브로드캐스트
        this.channelToSymbols.forEach((set, channel) => {
          if (set.has(asset.symbol)) {
            this.events.emit('marketData.update', { channel, data: [asset] });
          }
        });
      });
    });
  }

  private prepare = (payload: MarketPayload) => {
    const { assetType, channel, symbols } = payload;
    const provider = this.providerMap.get(assetType);
    return { provider, channel: `${assetType}:${channel}`, symbols };
  };

  private addIndex(channel: string, symbols: string[]) {
    const set = this.channelToSymbols.get(channel) ?? new Set<string>();
    symbols.forEach(s => set.add(s));
    this.channelToSymbols.set(channel, set);
  }

  public async subscribe(clientId: string, payload: MarketPayload): Promise<string> {
    const { assetType, channel } = payload; // SYMBOL 분기 제거
    const provider = this.providerMap.get(assetType);
    if (!provider) {
      throw new BadRequestException(`No provider found for asset type: "${assetType}"`);
    }

    const cacheKey = `${assetType}:${channel}`; // 예: stocks:gainers
    const cached = await this.cacheManager.get<Asset[]>(cacheKey);
    const symbols = (cached ?? []).map(a => a.symbol);

    const fullChannel = `${assetType}:${channel}`; // 방송형만 사용
    const subs = this.subscriptions.get(fullChannel);
    if (!subs || subs.length === 0) {
      this.subscriptions.set(fullChannel, [clientId]);
      this.addIndex(fullChannel, symbols);
      if (symbols.length > 0) provider.subscribe(symbols);
    } else if (!subs.includes(clientId)) {
      subs.push(clientId);
    }
    return fullChannel;
  }

  public unsubscribe(clientId: string, payload: MarketPayload): string {
    const { assetType, channel } = payload;
    const fullChannel = `${assetType}:${channel}`;
    const subs = this.subscriptions.get(fullChannel);
    if (subs) {
      const i = subs.indexOf(clientId);
      if (i !== -1) subs.splice(i, 1);
      // 방송형은 ref-count만 줄이고 실제 unsubscribe는 마지막 해제 시에만 필요(필요시 구현)
    }
    return fullChannel;
  }
}
