import { Asset, AssetType } from '@/common/types';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BadRequestException, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Cache } from 'cache-manager';
import { FinancialProvider } from '../providers/financial.provider';
import { AssetMethod, AssetQueryParams, AssetServiceConfig, MarketDataType } from '../types';

export abstract class AssetService implements OnModuleInit {
  protected readonly logger = new Logger(this.constructor.name);

  protected abstract readonly assetType: AssetType;
  protected abstract readonly providerMap: Map<AssetType, FinancialProvider>;
  protected abstract getCacheKey(params: AssetQueryParams): string;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @Inject('ASSET_SERVICE_CONFIG') private readonly config: AssetServiceConfig,
  ) {}

  async onModuleInit() {
    this.logger.log(`Initializing ${this.assetType} caches...`);
    await this.refreshAllCachesNow();
  }

  // 설정 기반: 12시간 주기
  @Cron(CronExpression.EVERY_12_HOURS)
  async refreshEvery12Hours() {
    await this.refreshCachesByInterval('EVERY_12_HOURS');
  }

  // 설정 기반: 1분 주기
  @Cron(CronExpression.EVERY_MINUTE)
  async refreshEveryMinute() {
    await this.refreshCachesByInterval('EVERY_MINUTE');
  }

  // interval로 매핑된 데이터타입만 동적 리프레시
  private async refreshCachesByInterval(interval: string) {
    const targets = Array.from(this.config.cacheableDataTypeMap.entries())
      .filter(([_, cfg]) => cfg.refreshInterval === interval)
      .map(([dataType]) => dataType);

    if (targets.length === 0) return;

    this.logger.debug(`[${this.assetType}] refresh interval=${interval}, types=[${targets.join(', ')}]`);
    await Promise.allSettled(targets.map(dt => this.refreshCache(dt)));
  }

  // 수동 전체 리프레시(부트스트랩 시 1회)
  private async refreshAllCachesNow() {
    const targets = Array.from(this.config.cacheableDataTypeMap.keys());
    if (targets.length === 0) return;

    this.logger.debug(`[${this.assetType}] initial refresh for types=[${targets.join(', ')}]`);
    await Promise.allSettled(targets.map(dt => this.refreshCache(dt)));
  }

  async refreshCache(dataType: MarketDataType, limit?: number): Promise<void> {
    try {
      if (!this.isValidDataType(dataType) || !this.isValidProvider(this.assetType)) {
        this.logger.warn(`Skip refresh. Invalid dataType or provider. type=${dataType}, asset=${this.assetType}`);
        return;
      }

      const actualLimit = limit ?? this.getDefaultLimit(dataType);
      const params: AssetQueryParams = { assetType: this.assetType, dataType, limit: actualLimit };

      const methodName = this.config.dataTypeMethodMap.get(dataType);
      if (!methodName) {
        this.logger.warn(`No method mapped for data type: ${dataType}`);
        return;
      }

      const provider = this.providerMap.get(this.assetType);
      const method = provider[methodName] as AssetMethod;

      const freshData = await method.call(provider, params);
      const enrichedData = await this.enrichWithNames(freshData);

      const cacheKey = this.getCacheKey(params);
      const ttl = this.getTTL(dataType);
      if (ttl > 0) {
        await this.cacheManager.set(cacheKey, enrichedData, ttl);
      }

      this.logger.log(`✅ Cache saved: ${cacheKey} items=${enrichedData.length} ttl=${ttl}s`);
    } catch (error) {
      this.logger.error(`Failed to refresh cache for ${this.assetType}:${dataType}`, error);
    }
  }

  async getMarketData(params: AssetQueryParams): Promise<Asset[]> {
    if (!this.isValidDataType(params.dataType) || !this.isValidProvider(this.assetType)) {
      throw new BadRequestException(`Unsupported data type: "${params.dataType}" or provider: "${this.assetType}"`);
    }

    const cacheable = this.isCacheable(params.dataType);
    if (cacheable) {
      const cacheKey = this.getCacheKey(params);
      const cached = await this.cacheManager.get<Asset[]>(cacheKey);
      if (cached) {
        this.logger.debug(`✅ Cache hit: ${cacheKey}`);
        return cached;
      }
    }

    const methodName = this.config.dataTypeMethodMap.get(params.dataType);
    const provider = this.providerMap.get(this.assetType);
    const method = provider[methodName] as AssetMethod;
    const fresh = await method.call(provider, params);
    const enriched = await this.enrichWithNames(fresh);

    if (cacheable) {
      const cacheKey = this.getCacheKey(params);
      const ttl = this.getTTL(params.dataType);
      if (ttl > 0) {
        await this.cacheManager.set(cacheKey, enriched, ttl);
      }
    }

    return enriched;
  }

  // names 보강 (ASSETS 캐시 기반)
  private async enrichWithNames(assets: Asset[]): Promise<Asset[]> {
    const assetsKey = this.getCacheKey({ assetType: this.assetType, dataType: MarketDataType.ASSETS });
    const baseAssets = await this.cacheManager.get<Asset[]>(assetsKey);
    const map = new Map<string, string>();

    baseAssets?.forEach(a => {
      if (a.name && a.name !== a.symbol) map.set(a.symbol, a.name);
    });

    return assets.map(a => ({ ...a, name: map.get(a.symbol) || a.name || a.symbol }));
  }

  private isValidDataType(dataType: MarketDataType): boolean {
    return this.config.dataTypeMethodMap.has(dataType);
  }

  private isValidProvider(assetType: AssetType): boolean {
    return this.providerMap.has(assetType);
  }

  private isCacheable(dataType: MarketDataType): boolean {
    return this.config.cacheableDataTypeMap.has(dataType);
  }

  private getTTL(dataType: MarketDataType): number {
    const ttl = this.config.cacheableDataTypeMap.get(dataType)?.ttl ?? 0;
    return Math.max(0, ttl);
  }

  protected getDefaultLimit(dataType: MarketDataType): number {
    const dl = this.config.defaultLimits;
    return dl.get(dataType);
  }
}
