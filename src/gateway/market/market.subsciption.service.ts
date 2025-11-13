import { AppCacheService } from '@/cache/cache.service';
import { Asset, AssetType, STREAM_PROVIDER_MAP } from '@/common/types';
import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { BehaviorSubject, filter, map, Observable, Subject, withLatestFrom } from 'rxjs';
import { MarketPayload } from './dto/market.subscription.dto';
import { ChannelDataType, MarketChannel, MarketStreamData, MarketStreamProvider } from './types';

@Injectable()
export class MarketSubscriptionService {
  private readonly logger = new Logger(MarketSubscriptionService.name);

  // "STOCK:mostActive" → ["client1", "client2", "client3"]
  private readonly subscriptions = new BehaviorSubject<Map<string, string[]>>(new Map());
  // "AAPL" → ["market:stock:symbols:AAPL"]
  private readonly symbolChannels = new BehaviorSubject<Map<string, string[]>>(new Map());
  // "market:stock:symbols:AAPL" → ["ticker", "trade"]
  private readonly channelDataTypes = new BehaviorSubject<Map<string, ChannelDataType[]>>(new Map());
  private readonly marketDataStream = new Subject<MarketStreamData>();
  // {"channel": "market:stock:symbols:AAPL", "data": MarketStreamData}
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
  async subscribe(clientId: string, payload: MarketPayload): Promise<string[]> {
    const { assetType, channel, dataTypes, timeframe, symbols: payloadSymbols } = payload;

    const provider = this.streamProviders.get(assetType);
    if (!provider) throw new BadRequestException(`No provider found for asset type: "${assetType}"`);

    const subscribedChannelIds: string[] = []; // 구독된 채널 ID들을 반환하기 위한 배열

    if (channel === MarketChannel.SYMBOLS) {
      if (!payloadSymbols || payloadSymbols.length === 0) {
        throw new BadRequestException('Symbols are required for individual symbols subscription');
      }

      for (const symbol of payloadSymbols) {
        const channelId = `market:${assetType}:${MarketChannel.SYMBOLS}:${symbol}`; // 각 심볼마다 개별 채널 ID 생성
        const symbolsToSubscribe = [symbol]; // 이 심볼에 대해서만 구독

        const currentSymbolChannels = this.symbolChannels.value;
        const newSymbols = symbolsToSubscribe.filter(sym => {
          const channels = currentSymbolChannels.get(sym) || [];
          return !channels.includes(channelId);
        });

        if (newSymbols.length > 0) {
          provider.subscribe(newSymbols, dataTypes, timeframe);
          this.logger.log(`Provider subscribed to: [${newSymbols.join(', ')}] for channel: ${channelId}`);
        } else {
          this.logger.log(`Skipping provider subscription - all symbols already subscribed for channel: ${channelId}`);
        }

        this.updateSubscriptions(clientId, channelId, symbolsToSubscribe, dataTypes);
        subscribedChannelIds.push(channelId);
      }
    } else {
      // MOST_ACTIVE, TOP_GAINERS 등의 채널
      const defaultChannelId = `market:${assetType}:${channel}`;
      const cachedData = await this.cacheService.get<Asset[]>(defaultChannelId);
      const symbolsToSubscribe = (cachedData ?? []).map(a => {
        return assetType === AssetType.STOCK ? a.exchange + a.symbol : a.symbol;
      });

      const currentSymbolChannels = this.symbolChannels.value;
      const newSymbols = symbolsToSubscribe.filter(sym => {
        const channels = currentSymbolChannels.get(sym) || [];
        return !channels.includes(defaultChannelId);
      });

      if (newSymbols.length > 0) {
        provider.subscribe(newSymbols, dataTypes, timeframe);
        this.logger.log(`Provider subscribed to: [${newSymbols.join(', ')}] for channel: ${defaultChannelId}`);
      } else {
        this.logger.log(
          `Skipping provider subscription - all symbols already subscribed for channel: ${defaultChannelId}`,
        );
      }

      this.updateSubscriptions(clientId, defaultChannelId, symbolsToSubscribe, dataTypes);
      subscribedChannelIds.push(defaultChannelId);
    }
    return subscribedChannelIds; // 구독된 모든 채널 ID 반환
  }

  //  구독 해제
  unsubscribe(clientId: string, payload: MarketPayload): string[] {
    // string -> string[]로 변경
    const { assetType, channel, dataTypes, symbols: payloadSymbols } = payload;
    const unsubscribedChannelIds: string[] = [];

    if (channel === MarketChannel.SYMBOLS) {
      if (!payloadSymbols || payloadSymbols.length === 0) {
        throw new BadRequestException('Symbols are required for individual symbols unsubscription');
      }
      for (const symbol of payloadSymbols) {
        const channelId = `market:${assetType}:${MarketChannel.SYMBOLS}:${symbol}`;
        this.processUnsubscription(clientId, channelId, [symbol], assetType, dataTypes, unsubscribedChannelIds);
      }
    } else {
      // MOST_ACTIVE, TOP_GAINERS 등의 채널
      const defaultChannelId = `market:${assetType}:${channel}`;
      const symbolsInChannel = this.getSymbolsForChannel(defaultChannelId); // 이 채널에 연결된 모든 심볼 가져오기
      this.processUnsubscription(
        clientId,
        defaultChannelId,
        symbolsInChannel,
        assetType,
        dataTypes,
        unsubscribedChannelIds,
      );
    }
    return unsubscribedChannelIds;
  }

  getChannelBroadcasts(): Observable<{ channel: string; data: MarketStreamData }> {
    return this.channelBroadcasts.asObservable();
  }

  getMarketDataStream(): Observable<MarketStreamData> {
    return this.marketDataStream.asObservable();
  }

  private processUnsubscription(
    clientId: string,
    channelId: string,
    symbolsToProcess: string[],
    assetType: AssetType,
    dataTypes: ChannelDataType[],
    unsubscribedChannelIds: string[],
  ): void {
    const newSubscriptions = new Map(this.subscriptions.value);
    const channelSubscribers = newSubscriptions.get(channelId) || [];
    const updatedSubscribers = channelSubscribers.filter(id => id !== clientId);

    if (updatedSubscribers.length > 0) {
      newSubscriptions.set(channelId, updatedSubscribers);
    } else {
      newSubscriptions.delete(channelId); // 이 채널에 더 이상 구독자가 없으면 채널 삭제

      const provider = this.streamProviders.get(assetType);
      if (provider && symbolsToProcess.length > 0) {
        const newSymbolChannels = new Map(this.symbolChannels.value);
        const newChannelDataTypes = new Map(this.channelDataTypes.value);
        const symbolsToNotifyProvider: string[] = [];

        symbolsToProcess.forEach(symbol => {
          const channels = (newSymbolChannels.get(symbol) || []).filter(ch => ch !== channelId);

          if (channels.length === 0) {
            // 해당 심볼이 어떤 채널에도 속하지 않으면 provider에게 구독 해지 요청
            newSymbolChannels.delete(symbol);
            symbolsToNotifyProvider.push(symbol);
          } else {
            newSymbolChannels.set(symbol, channels);
          }
        });

        if (symbolsToNotifyProvider.length > 0) {
          provider.unsubscribe(symbolsToNotifyProvider, dataTypes);
          this.logger.log(
            `Provider unsubscribed from: [${symbolsToNotifyProvider.join(', ')}] for dataTypes: ${dataTypes.join(',')}`,
          );
        }
        newChannelDataTypes.delete(channelId);
        this.symbolChannels.next(newSymbolChannels);
        this.channelDataTypes.next(newChannelDataTypes);
      }
    }
    this.subscriptions.next(newSubscriptions);
    unsubscribedChannelIds.push(channelId);
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
          // marketData.payload.symbol은 단일 심볼이므로, 이 심볼을 포함하는 모든 채널을 찾습니다.
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

    // 각 심볼에 대해 해당 채널 이름을 추가합니다.
    symbols.forEach(symbol => {
      const symbolChannels = newSymbolChannels.get(symbol) || [];
      if (!symbolChannels.includes(channelName)) {
        newSymbolChannels.set(symbol, [...symbolChannels, channelName]);
      }
    });

    // 해당 채널에 대한 dataTypes를 병합하여 저장합니다.
    const existingDataTypes = newChannelDataTypes.get(channelName) || [];
    const mergedDataTypes = [...new Set([...existingDataTypes, ...dataTypes])];
    newChannelDataTypes.set(channelName, mergedDataTypes);

    this.subscriptions.next(newSubscriptions);
    this.symbolChannels.next(newSymbolChannels);
    this.channelDataTypes.next(newChannelDataTypes);
  }

  // 🎯 채널에 속한 심볼 목록 조회
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
