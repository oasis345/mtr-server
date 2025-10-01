import { Cacheable } from '@/cache/cache.decorator';
import { AppCacheService } from '@/cache/cache.service';
import { Asset, AssetType } from '@/common/types';
import { Logger } from '@nestjs/common';
import { buildMarketCacheKey } from '../cache/buildMarketCacheKey';
import { AssetServiceConfig } from '../config/assetConfig';
import { ProviderRegistry } from '../providers/provider.registry';
import { AssetQueryParams, CacheConfig, CandleQueryParams, CandleResponse, MarketDataType } from '../types';

export abstract class AssetService {
  protected readonly logger = new Logger(this.constructor.name);
  protected abstract readonly assetType: AssetType;
  private readonly inFlight = new Map<string, Promise<void>>();

  constructor(
    protected readonly registry: ProviderRegistry,
    protected readonly cacheService: AppCacheService,
    protected readonly config: AssetServiceConfig,
  ) {}

  protected async afterCallProviderMethod(assets: Asset[], dataType: MarketDataType): Promise<Asset[]> {
    return Promise.resolve(assets);
  }

  // async refreshCache(dataType: MarketDataType, limit?: number): Promise<void> {
  //   const actualLimit = limit ?? this.config.defaultLimits.get(dataType);
  //   const params = { assetType: this.assetType, dataType, limit: actualLimit };
  //   const data = await this.registry.call<Asset[]>(this.assetType, dataType, params);
  //   const enrichedData = await this.afterCallProviderMethod(data, dataType);
  //   const key = buildMarketCacheKey(params); // ← limit 포함된 동일 키
  //   const ttlCfg = this.config.cacheableDataTypeMap.get(dataType);
  //   if (ttlCfg) await this.cacheService.set(key, enrichedData, this.getTtl(ttlCfg, params));
  // }

  async refreshCache(dataType: MarketDataType, limit?: number): Promise<void> {
    const actualLimit = limit ?? this.config.defaultLimits.get(dataType);
    const params = { assetType: this.assetType, dataType, limit: actualLimit };
    const key = buildMarketCacheKey(params);

    const existing = this.inFlight.get(key);
    if (existing) {
      await existing;
      return;
    }

    const task = (async () => {
      const data = await this.registry.call<Asset[]>(this.assetType, dataType, params);
      const enrichedData = await this.afterCallProviderMethod(data, dataType);
      const ttlCfg = this.config.cacheableDataTypeMap.get(dataType);
      const ttl = this.getTtl(ttlCfg, params);
      if (ttlCfg && ttl > 0)
        await this.cacheService.set(key, enrichedData, ttl, `refreshCache(${this.assetType}:${dataType})`);
    })().finally(() => this.inFlight.delete(key));

    this.inFlight.set(key, task);
    await task;
  }

  @Cacheable<[AssetQueryParams], AssetService>({
    key: ({ args: [params], instance }) => {
      const effectiveLimit = params.limit ?? instance.config.defaultLimits.get(params.dataType);
      return buildMarketCacheKey({ ...params, limit: effectiveLimit });
    },
    ttl: ({ args: [params], instance }) =>
      instance.getTtl(instance.config.cacheableDataTypeMap.get(params.dataType), params),
    when: ({ args: [params], instance }) => instance.config.cacheableDataTypeMap.has(params.dataType),
  })
  async getMarketData(params: AssetQueryParams): Promise<Asset[]> {
    try {
      const effectiveLimit = params.limit ?? this.config.defaultLimits.get(params.dataType);
      const data = await this.registry.call<Asset[]>(this.assetType, params.dataType, {
        ...params,
        limit: effectiveLimit,
      });
      const enrichedData = await this.afterCallProviderMethod(data, params.dataType);
      return enrichedData;
    } catch (error) {
      this.logger.error(`Failed to get market data for ${this.assetType}:${params.dataType}`);
      throw error;
    }
  }

  /**
   * 캔들 데이터 전용 조회 메서드
   */
  @Cacheable<[CandleQueryParams], AssetService>({
    key: ({ args: [params] }) => buildMarketCacheKey(params),
    ttl: ({ args: [params], instance }) =>
      instance.getTtl(instance.config.cacheableDataTypeMap.get(MarketDataType.CANDLES), params),
  })
  async getCandles(params: CandleQueryParams): Promise<CandleResponse> {
    try {
      const response = await this.registry.call<CandleResponse>(this.assetType, MarketDataType.CANDLES, params);
      return response;
    } catch (error) {
      this.logger.error(`Failed to get candles for ${this.assetType}: ${params.symbols?.join(',')}`);
      throw error;
    }
  }

  protected getTtl = (cfg: CacheConfig | undefined, params: AssetQueryParams) =>
    typeof cfg?.ttl === 'function' ? cfg.ttl(params) : (cfg?.ttl ?? 0);
}
