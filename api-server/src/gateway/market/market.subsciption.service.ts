import { AppCacheService } from '@/cache/cache.service';
import { Asset, AssetType, STREAM_PROVIDER_MAP } from '@/common/types';
import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { BehaviorSubject, filter, map, Observable, Subject, withLatestFrom } from 'rxjs';
import { MarketPayload } from './dto/market.subscription.dto';
import { ChannelDataType, MarketChannel, MarketStreamData } from './types';
import { MarketStreamProvider } from './types/provider.interface';

@Injectable()
export class MarketSubscriptionService {
  private readonly logger = new Logger(MarketSubscriptionService.name);

  // "STOCK:mostActive" → ["client1", "client2", "client3"]
  private readonly subscriptions = new BehaviorSubject<Map<string, string[]>>(new Map());
  // "AAPL" → ["STOCK:mostActive", "STOCK:gainers"]
  private readonly symbolChannels = new BehaviorSubject<Map<string, string[]>>(new Map());
  // "market:crypto:topTraded" → ["ticker", "trade", "candle"]
  private readonly channelDataTypes = new BehaviorSubject<Map<string, ChannelDataType[]>>(new Map());
  private readonly marketDataStream = new Subject<MarketStreamData>();
  // {"channel": "STOCK:mostActive", "data": [Asset1, Asset2, Asset3]}
  private readonly channelBroadcasts = new Subject<{ channel: string; data: MarketStreamData }>();

  constructor(
    @Inject(STREAM_PROVIDER_MAP)
    private readonly streamProviders: Map<AssetType, MarketStreamProvider>,
    private readonly cacheService: AppCacheService,
  ) {
    this.initializeStreamProviders();
    this.setupChannelBroadcasting();
  }

  // 🎯 구독 처리
  async subscribe(clientId: string, payload: MarketPayload): Promise<string> {
    const { assetType, channel, dataTypes, timeframe } = payload;
    const provider = this.streamProviders.get(assetType);
    if (!provider) throw new BadRequestException(`No provider found for asset type: "${assetType}"`);

    const defaultChannelId = `market:${assetType}:${channel}`;
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
      provider.subscribe(newSymbols, dataTypes, timeframe);
      this.logger.log(`Provider subscribed to: [${newSymbols.join(', ')}] for channel: ${channelId}`);
    } else {
      this.logger.log(`Skipping provider subscription - all symbols already subscribed for channel: ${channelId}`);
    }

    this.updateSubscriptions(clientId, channelId, symbols, dataTypes);

    return channelId;
  }

  //  구독 해제
  unsubscribe(clientId: string, payload: MarketPayload): string {
    const { assetType, channel, dataTypes } = payload;

    let channelId: string;
    const defaultChannelId = `market:${assetType}:${channel}`;

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

    const newSubscriptions = new Map(this.subscriptions.value);
    const channelSubscribers = newSubscriptions.get(channelId) || [];
    const updatedSubscribers = channelSubscribers.filter(id => id !== clientId);

    if (updatedSubscribers.length > 0) {
      newSubscriptions.set(channelId, updatedSubscribers);
    } else {
      newSubscriptions.delete(channelId);

      const provider = this.streamProviders.get(assetType);
      const symbols = this.getSymbolsForChannel(channelId);

      if (provider && symbols.length > 0) {
        const newSymbolChannels = new Map(this.symbolChannels.value);
        const newChannelDataTypes = new Map(this.channelDataTypes.value);
        const symbolsToUnsubscribe: string[] = [];

        symbols.forEach(symbol => {
          const channels = (newSymbolChannels.get(symbol) || []).filter(ch => ch !== channelId);

          if (channels.length === 0) {
            newSymbolChannels.delete(symbol);
            symbolsToUnsubscribe.push(symbol);
          } else {
            newSymbolChannels.set(symbol, channels);
          }
        });

        if (symbolsToUnsubscribe.length > 0) {
          provider.unsubscribe(symbolsToUnsubscribe, dataTypes);
          this.logger.log(`Provider unsubscribed from: [${symbolsToUnsubscribe.join(', ')}]`);
        }
        newChannelDataTypes.delete(channelId);
        this.symbolChannels.next(newSymbolChannels);
        this.channelDataTypes.next(newChannelDataTypes);
      }
    }

    this.subscriptions.next(newSubscriptions);
    return channelId;
  }

  getChannelBroadcasts(): Observable<{ channel: string; data: MarketStreamData }> {
    return this.channelBroadcasts.asObservable();
  }

  getMarketDataStream(): Observable<MarketStreamData> {
    return this.marketDataStream.asObservable();
  }

  //  스트림 프로바이더 초기화
  private initializeStreamProviders(): void {
    this.streamProviders.forEach(provider => {
      provider.getDataStream().subscribe(marketData => {
        this.marketDataStream.next(marketData);
      });
    });
  }

  // 🎯 채널 브로드캐스팅 설정
  private setupChannelBroadcasting(): void {
    this.marketDataStream
      .pipe(
        withLatestFrom(this.symbolChannels, this.channelDataTypes),
        map(([marketData, symbolChannels, channelDataTypes]) => {
          const subscribedChannels = symbolChannels.get(marketData.payload.symbol) || [];
          return subscribedChannels
            .filter(channel => {
              const allowedDataTypes = channelDataTypes.get(channel) || [];
              return marketData.dataType && allowedDataTypes.includes(marketData.dataType);
            })
            .map(channel => ({
              channel,
              data: marketData,
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

  // 🎯 구독 상태 업데이트
  private updateSubscriptions(
    clientId: string,
    channelName: string,
    symbols: string[],
    dataTypes: ChannelDataType[],
  ): void {
    const newSubscriptions = new Map(this.subscriptions.value);
    const newSymbolChannels = new Map(this.symbolChannels.value);
    const newChannelDataTypes = new Map(this.channelDataTypes.value);
    const channelSubscribers = newSubscriptions.get(channelName) || [];

    if (!channelSubscribers.includes(clientId)) {
      newSubscriptions.set(channelName, [...channelSubscribers, clientId]);
    }

    symbols.forEach(symbol => {
      const symbolChannels = newSymbolChannels.get(symbol) || [];
      if (!symbolChannels.includes(channelName)) {
        newSymbolChannels.set(symbol, [...symbolChannels, channelName]);
      }
    });

    const existingDataTypes = newChannelDataTypes.get(channelName) || [];
    const mergedDataTypes = [...new Set([...existingDataTypes, ...dataTypes])];
    newChannelDataTypes.set(channelName, mergedDataTypes);

    this.subscriptions.next(newSubscriptions);
    this.symbolChannels.next(newSymbolChannels);
    this.channelDataTypes.next(newChannelDataTypes);
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
}
