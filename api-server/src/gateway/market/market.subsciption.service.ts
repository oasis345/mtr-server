import { AppCacheService } from '@/cache/cache.service';
import { Asset, AssetType, STREAM_PROVIDER_MAP } from '@/common/types';
import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { BehaviorSubject, Observable, Subject, filter, map, withLatestFrom } from 'rxjs';
import { MarketChannel, MarketPayload } from './dto/market.subscription.dto';
import { MarketStreamProvider } from './types/provider.interface';

@Injectable()
export class MarketSubscriptionService {
  private readonly logger = new Logger(MarketSubscriptionService.name);

  // "STOCK:mostActive" → ["client1", "client2", "client3"]
  private readonly subscriptions = new BehaviorSubject<Map<string, string[]>>(new Map());
  // "AAPL" → ["STOCK:mostActive", "STOCK:gainers"]
  private readonly symbolChannels = new BehaviorSubject<Map<string, string[]>>(new Map());
  private readonly marketDataStream = new Subject<Asset>();
  // {"channel": "STOCK:mostActive", "data": [Asset1, Asset2, Asset3]}
  private readonly channelBroadcasts = new Subject<{ channel: string; data: Asset[] }>();

  constructor(
    @Inject(STREAM_PROVIDER_MAP)
    private readonly streamProviders: Map<AssetType, MarketStreamProvider>,
    private readonly cacheService: AppCacheService,
  ) {
    this.initializeStreamProviders();
    this.setupChannelBroadcasting();
  }

  //  스트림 프로바이더 초기화
  private initializeStreamProviders(): void {
    this.streamProviders.forEach(provider => {
      provider.getDataStream().subscribe(asset => {
        this.marketDataStream.next(asset);
      });
    });
  }

  // 🎯 채널 브로드캐스팅 설정
  private setupChannelBroadcasting(): void {
    this.marketDataStream
      .pipe(
        withLatestFrom(this.symbolChannels),
        map(([asset, symbolChannels]) => {
          const subscribedChannels = symbolChannels.get(asset.symbol) || [];

          return subscribedChannels.map(channel => ({
            channel,
            data: [asset],
          }));
        }),
        filter(broadcasts => broadcasts.length > 0),
      )
      .subscribe(broadcasts => {
        broadcasts.forEach(({ channel, data }) => {
          this.channelBroadcasts.next({ channel, data });
        });
      });
  }

  // 🎯 구독 처리
  async subscribe(clientId: string, payload: MarketPayload): Promise<string> {
    const { assetType, channel } = payload;
    const provider = this.streamProviders.get(assetType);
    if (!provider) throw new BadRequestException(`No provider found for asset type: "${assetType}"`);

    const defaultChannelId = `market:${assetType}:${channel}:`;
    let channelId = defaultChannelId;
    let symbols: string[] = [];

    switch (channel) {
      case MarketChannel.USER_SYMBOLS: {
        if (!payload.userSymbols?.length) {
          throw new BadRequestException('User symbols are required for user symbol subscription');
        }
        channelId = `${defaultChannelId}:${clientId}`;
        symbols = payload.userSymbols; // 이미 컨트롤러/DTO에서 대문자/정렬 정규화 가정
        break;
      }
      case MarketChannel.SYMBOL: {
        if (!payload.symbol) {
          throw new BadRequestException('Symbol is required for individual symbol subscription');
        }
        channelId = `${defaultChannelId}:${payload.symbol}`;
        symbols = [payload.symbol];
        break;
      }
      default: {
        // mostActive/gainers/losers 등
        const cachedData = await this.cacheService.get<Asset[]>(defaultChannelId);
        symbols = (cachedData ?? []).map(a => a.symbol);
        break;
      }
    }

    // 1) 상태 업데이트 이전에 실제 신규 구독 대상 계산
    const currentSymbolChannels = this.symbolChannels.value;
    const newSymbols = symbols.filter(sym => {
      const channels = currentSymbolChannels.get(sym) || [];
      return !channels.includes(channelId);
    });

    // 2) 신규 심볼만 구독
    if (newSymbols.length > 0) {
      provider.subscribe(newSymbols);
      this.logger.log(`Provider subscribed to: [${newSymbols.join(', ')}] for channel: ${channelId}`);
    }

    // 3) 상태 반영
    this.updateSubscriptions(clientId, channelId, symbols);

    return channelId;
  }

  //  구독 해제
  unsubscribe(clientId: string, payload: MarketPayload): string {
    const { assetType, channel } = payload;

    let channelId: string;
    const defaultChannelId = `${assetType}:${channel}`;

    switch (channel) {
      case MarketChannel.USER_SYMBOLS:
        channelId = `${defaultChannelId}:${clientId}`;
        break;
      case MarketChannel.SYMBOL:
        if (!payload.symbol) {
          throw new BadRequestException('Symbol is required for individual symbol unsubscription');
        }
        channelId = `${defaultChannelId}:${payload.symbol}`;
        break;
      default:
        channelId = defaultChannelId;
        break;
    }

    const currentSubscriptions = this.subscriptions.value;
    const channelSubscribers = currentSubscriptions.get(channelId) || [];
    const updatedSubscribers = channelSubscribers.filter(id => id !== clientId);

    if (updatedSubscribers.length === 0) {
      const provider = this.streamProviders.get(assetType);
      const symbols = this.getSymbolsForChannel(channelId);

      // 심볼별로 구독된 채널이 있는지 체크
      if (provider && symbols.length > 0) {
        const symbolsToUnsubscribe: string[] = [];

        symbols.forEach(symbol => {
          const channels = this.symbolChannels.value.get(symbol) || [];
          const remainingChannels = channels.filter(ch => ch !== channelId);

          if (remainingChannels.length === 0) {
            symbolsToUnsubscribe.push(symbol);
          }
        });

        // 구독된 심볼이 없으면 구독 해제
        if (symbolsToUnsubscribe.length > 0) {
          provider.unsubscribe(symbolsToUnsubscribe);
          this.logger.log(`Provider unsubscribed from: [${symbolsToUnsubscribe.join(', ')}]`);
        }
      }

      currentSubscriptions.delete(channelId);
      this.cleanupChannel(channelId);
    } else {
      currentSubscriptions.set(channelId, updatedSubscribers);
    }

    this.subscriptions.next(new Map(currentSubscriptions));
    return channelId;
  }

  // 🎯 구독 상태 업데이트
  private updateSubscriptions(clientId: string, channelName: string, symbols: string[]): void {
    const currentSubscriptions = this.subscriptions.value;
    const currentSymbolChannels = this.symbolChannels.value;
    const channelSubscribers = currentSubscriptions.get(channelName) || [];

    // 채널 구독자 추가
    if (!channelSubscribers.includes(clientId)) {
      channelSubscribers.push(clientId);
      currentSubscriptions.set(channelName, channelSubscribers);
    }

    // 심볼별로 채널 추가
    symbols.forEach(symbol => {
      const symbolChannels = currentSymbolChannels.get(symbol) || [];
      if (!symbolChannels.includes(channelName)) {
        symbolChannels.push(channelName);
        currentSymbolChannels.set(symbol, symbolChannels);
      }
    });

    this.subscriptions.next(new Map(currentSubscriptions));
    this.symbolChannels.next(new Map(currentSymbolChannels));
  }

  //  채널 정리
  private cleanupChannel(channelName: string): void {
    const currentSymbolChannels = this.symbolChannels.value;

    currentSymbolChannels.forEach((channels, symbol) => {
      const updatedChannels = channels.filter(channel => channel !== channelName);
      if (updatedChannels.length === 0) {
        currentSymbolChannels.delete(symbol);
      } else {
        currentSymbolChannels.set(symbol, updatedChannels);
      }
    });

    this.symbolChannels.next(new Map(currentSymbolChannels));
  }

  // 🎯 채널의 심볼들 조회
  private getSymbolsForChannel(channelName: string): string[] {
    const symbolChannels = this.symbolChannels.value;
    const symbols: string[] = [];

    symbolChannels.forEach((channels, symbol) => {
      if (channels.includes(channelName)) {
        symbols.push(symbol);
      }
    });

    return symbols;
  }

  getChannelBroadcasts(): Observable<{ channel: string; data: Asset[] }> {
    return this.channelBroadcasts.asObservable();
  }

  getMarketDataStream(): Observable<Asset> {
    return this.marketDataStream.asObservable();
  }
}
