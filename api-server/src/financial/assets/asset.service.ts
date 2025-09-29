import { Cacheable } from '@/cache/cache.decorator';
import { AppCacheService } from '@/cache/cache.service';
import { buildMarketCacheKey } from '@/cache/cacheKeyUtils';
import { Asset, AssetType } from '@/common/types';
import { Logger } from '@nestjs/common';
import { AssetServiceConfig } from '../config/assetConfig';
import { ProviderRegistry } from '../providers/provider.registry';
import { AssetQueryParams, MarketDataType } from '../types';

export abstract class AssetService {
  protected readonly logger = new Logger(this.constructor.name);
  protected abstract readonly assetType: AssetType;

  constructor(
    protected readonly registry: ProviderRegistry,
    protected readonly cacheService: AppCacheService,
    protected readonly config: AssetServiceConfig,
  ) {}

  protected async afterCallProviderMethod(assets: Asset[], dataType: MarketDataType): Promise<Asset[]> {
    return Promise.resolve(assets);
  }

  async refreshCache(dataType: MarketDataType, limit?: number): Promise<void> {
    const actualLimit = limit ?? this.config.defaultLimits.get(dataType);
    const params = { assetType: this.assetType, dataType, limit: actualLimit };
    const fresh = await this.registry.call<Asset[]>(this.assetType, dataType, params);
    const enriched = await this.afterCallProviderMethod(fresh, dataType);
    const key = buildMarketCacheKey(params);
    const ttl = this.config.cacheableDataTypeMap.get(dataType)?.ttl;
    if (ttl) await this.cacheService.set(key, enriched, ttl);
  }

  @Cacheable<[AssetQueryParams], AssetService>({
    key: ({ args: [params] }) => buildMarketCacheKey(params),
    ttl: ({ args: [params], instance }) => instance.config.cacheableDataTypeMap.get(params.dataType)?.ttl,
    when: ({ args: [params], instance }) => instance.config.cacheableDataTypeMap.has(params.dataType),
  })
  async getMarketData(params: AssetQueryParams): Promise<Asset[]> {
    try {
      const freshData = await this.registry.call<Asset[]>(this.assetType, params.dataType, params);
      const enriched = await this.afterCallProviderMethod(freshData, params.dataType);

      return enriched;
    } catch (error) {
      this.logger.error(`Failed to get market data for ${this.assetType}:${params.dataType}`);
      throw error;
    }
  }
}
