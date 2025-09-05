import { CacheTTL } from '@/common/constants/cache.constants';
import { isFunction } from '@/common/utils/type-guards';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BadRequestException, Inject, InternalServerErrorException, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Cache } from 'cache-manager';
import { FinancialProvider } from '../providers/financial.provider';
import { Asset, AssetQueryParams, AssetType, MarketDataType } from '../types';
export abstract class AssetService implements OnModuleInit {
  protected readonly logger = new Logger(this.constructor.name);

  protected abstract readonly assetType: AssetType;
  protected abstract readonly providerMap: Map<AssetType, FinancialProvider>;
  protected abstract readonly dataTypeMethodMap: Record<MarketDataType, keyof FinancialProvider>;
  protected abstract readonly cacheableDataTypes: Set<MarketDataType>;
  protected abstract getCacheKey(params: AssetQueryParams): string;

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  async onModuleInit() {
    this.logger.log(`Initializing ${this.assetType} caches...`);
    await Promise.allSettled([
      this.refreshCache(MarketDataType.ASSETS),
      this.refreshCache(MarketDataType.MOST_ACTIVE),
      this.refreshCache(MarketDataType.GAINERS),
      this.refreshCache(MarketDataType.LOSERS),
    ]);
  }

  @Cron(CronExpression.EVERY_HOUR)
  async refreshAllCaches() {
    this.logger.log(`Scheduled refresh for ${this.assetType} caches...`);
    await Promise.allSettled([
      this.refreshCache(MarketDataType.ASSETS),
      this.refreshCache(MarketDataType.MOST_ACTIVE),
      this.refreshCache(MarketDataType.GAINERS),
      this.refreshCache(MarketDataType.LOSERS),
    ]);
  }

  async refreshCache(dataType: MarketDataType, limit: number = 50): Promise<void> {
    try {
      const params: AssetQueryParams = { assetType: this.assetType, dataType, limit };

      const methodName = this.dataTypeMethodMap[dataType];
      if (!methodName) {
        this.logger.warn(`No method mapped for data type: ${dataType}`);
        return;
      }

      const provider = this.providerMap.get(this.assetType);
      if (!provider) {
        this.logger.warn(`No provider found for asset type: ${this.assetType}`);
        return;
      }

      const method = provider[methodName] as Function;
      const freshData = await method.call(provider, params);

      const cacheKey = this.getCacheKey(params);

      await this.cacheManager.set(cacheKey, freshData, CacheTTL.ONE_HOUR);
      this.logger.log(`✅ Cache saved: ${cacheKey} (${freshData.length} items)`);
    } catch (error) {
      this.logger.error(`Failed to refresh cache for ${this.assetType}:${dataType}`, error);
    }
  }

  async getMarketData(params: AssetQueryParams): Promise<Asset[]> {
    const isCacheable = this.cacheableDataTypes.has(params.dataType);

    if (isCacheable) {
      const cacheKey = this.getCacheKey(params);

      const cachedData = await this.cacheManager.get<Asset[]>(cacheKey);
      if (cachedData) {
        this.logger.debug(`✅ Cache hit: ${cacheKey}`);
        return cachedData;
      }
    }

    const methodName = this.dataTypeMethodMap[params.dataType];
    if (!methodName) {
      throw new BadRequestException(`Unsupported data type: "${params.dataType}"`);
    }

    const provider = this.providerMap.get(this.assetType);
    if (!provider) {
      throw new BadRequestException(`No provider found for asset type: "${this.assetType}"`);
    }

    const method = provider[methodName];
    if (!isFunction(method)) {
      throw new InternalServerErrorException(`Method name '${methodName}' resolved to a non-function property.`);
    }

    const freshData = await method.call(provider, params);

    if (isCacheable) {
      const cacheKey = this.getCacheKey(params);
      await this.cacheManager.set(cacheKey, freshData, CacheTTL.ONE_HOUR);
    }

    return freshData;
  }
}
