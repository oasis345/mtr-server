import { Asset, AssetType } from '@/common/types';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BadRequestException, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Cache } from 'cache-manager';
import { FinancialProvider } from '../providers/financial.provider';
import { AssetMethod, AssetQueryParams, CacheConfig, DataTypeMethodMap, MarketDataType } from '../types';

export abstract class AssetService implements OnModuleInit {
  protected readonly logger = new Logger(this.constructor.name);

  protected abstract readonly assetType: AssetType;
  protected abstract readonly providerMap: Map<AssetType, FinancialProvider>;
  protected abstract readonly dataTypeMethodMap: DataTypeMethodMap;
  protected abstract readonly cacheableDataTypeMap: Map<MarketDataType, CacheConfig>;
  protected abstract getCacheKey(params: AssetQueryParams): string;

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  async onModuleInit() {
    this.logger.log(`Initializing ${this.assetType} caches...`);
    await this.refreshAssetsCache();
    await this.refreshAllCaches();
  }

  @Cron(CronExpression.EVERY_12_HOURS)
  async refreshAssetsCache() {
    this.logger.log(`Scheduled refresh for ${this.assetType} assets...`);
    await this.refreshCache(MarketDataType.ASSETS);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async refreshAllCaches() {
    await Promise.allSettled([
      this.refreshCache(MarketDataType.MOST_ACTIVE),
      this.refreshCache(MarketDataType.GAINERS),
      this.refreshCache(MarketDataType.LOSERS),
    ]);
  }

  async refreshCache(dataType: MarketDataType, limit: number = 50): Promise<void> {
    try {
      if (!this.isValidDataType(dataType) || !this.isValidProvider(this.assetType)) {
        this.logger.warn(`No method mapped for data type: ${dataType} or provider: ${this.assetType}`);
        return;
      }

      const params: AssetQueryParams = { assetType: this.assetType, dataType, limit };
      const methodName = this.dataTypeMethodMap.get(dataType);
      const provider = this.providerMap.get(this.assetType);
      const method = provider[methodName] as AssetMethod;
      const freshData = await method.call(provider, params);

      // 🎯 캐시 저장 전에 name 보강
      const enrichedData = await this.enrichWithNames(freshData);
      const cacheKey = this.getCacheKey(params);
      const ttl = this.cacheableDataTypeMap.get(dataType).ttl;

      await this.cacheManager.set(cacheKey, enrichedData, ttl);
      this.logger.log(`✅ Cache saved with names: ${cacheKey} (${enrichedData.length} items)`);
    } catch (error) {
      this.logger.error(`Failed to refresh cache for ${this.assetType}:${dataType}`, error);
    }
  }

  async getMarketData(params: AssetQueryParams): Promise<Asset[]> {
    if (!this.isValidDataType(params.dataType) || !this.isValidProvider(this.assetType))
      throw new BadRequestException(`Unsupported data type: "${params.dataType}" or provider: "${this.assetType}"`);

    const isCacheable = this.cacheableDataTypeMap.has(params.dataType);

    if (isCacheable) {
      const cacheKey = this.getCacheKey(params);
      const cachedData = await this.cacheManager.get<Asset[]>(cacheKey);
      if (cachedData) {
        this.logger.debug(`✅ Cache hit: ${cacheKey}`);
        return cachedData;
      }
    }

    const methodName = this.dataTypeMethodMap.get(params.dataType);
    const provider = this.providerMap.get(this.assetType);
    const method = provider[methodName] as AssetMethod;
    const freshData = await method.call(provider, params);
    const enrichedData = await this.enrichWithNames(freshData);

    if (isCacheable) {
      const cacheKey = this.getCacheKey(params);
      const ttl = this.cacheableDataTypeMap.get(params.dataType).ttl;
      await this.cacheManager.set(cacheKey, enrichedData, ttl);
    }

    return enrichedData;
  }

  private async enrichWithNames(assets: Asset[]): Promise<Asset[]> {
    const cacheKey = this.getCacheKey({
      assetType: this.assetType,
      dataType: MarketDataType.ASSETS,
    });

    const cachedAssets = await this.cacheManager.get<Asset[]>(cacheKey);
    const symbolNameMap = new Map<string, string>();

    if (cachedAssets) {
      cachedAssets.forEach(asset => {
        if (asset.name && asset.name !== asset.symbol) {
          symbolNameMap.set(asset.symbol, asset.name);
        }
      });
    }

    return assets.map(asset => {
      const enrichedName = symbolNameMap.get(asset.symbol);
      const finalName = enrichedName || asset.name || asset.symbol;

      return {
        ...asset,
        name: finalName,
      };
    });
  }

  private isValidDataType(dataType: MarketDataType): boolean {
    return this.dataTypeMethodMap.has(dataType);
  }

  private isValidProvider(assetType: AssetType): boolean {
    return this.providerMap.has(assetType);
  }
}
