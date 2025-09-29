import { AppCacheService } from '@/cache/cache.service';
import { buildMarketCacheKey } from '@/cache/cacheKeyUtils';
import { Asset } from '@/common/types';
import { AssetType } from '@/common/types/asset.types';
import { ProviderRegistry } from '@/financial/providers/provider.registry';
import { LogoService } from '@/financial/services/logo.service';
import { Injectable } from '@nestjs/common';
import { AssetServiceConfig } from '../../config/assetConfig';
import { MarketDataType } from '../../types';
import { AssetService } from '../asset.service';

@Injectable()
export class StockService extends AssetService {
  protected readonly assetType = AssetType.STOCK;

  constructor(
    registry: ProviderRegistry,
    cacheService: AppCacheService,
    config: AssetServiceConfig,
    protected readonly logoService: LogoService,
  ) {
    super(registry, cacheService, config);
  }

  protected async afterCallProviderMethod(assets: Asset[], dataType: MarketDataType): Promise<Asset[]> {
    // 1) 이름 보강
    const assetsKey = buildMarketCacheKey({ assetType: this.assetType, dataType: MarketDataType.ASSETS });
    const baseAssets = await this.cacheService.get<Asset[]>(assetsKey);
    const nameMap = new Map<string, string>();
    baseAssets?.forEach(a => {
      if (a.name && a.name !== a.symbol) nameMap.set(a.symbol, a.name);
    });

    const named = assets.map(a => ({
      ...a,
      name: nameMap.get(a.symbol) || a.name || a.symbol,
    }));

    // 2) 로고 보강 조건 확인
    const withLogo = this.config.cacheableDataTypeMap.get(dataType)?.withLogo ?? false;
    const MAX_LOGO_FETCH = 100;
    if (!withLogo || !this.logoService || named.length > MAX_LOGO_FETCH) {
      if (withLogo && named.length > MAX_LOGO_FETCH) {
        this.logger.warn(`Skipping logo fetch: too many assets (${named.length}) for dataType: ${dataType}`);
      }
      return named;
    }

    // 3) 로고 보강
    try {
      const cachedLogoMap = await this.logoService.getLogoMap();
      const targets = named.filter(a => !cachedLogoMap[a.symbol]).map(a => ({ symbol: a.symbol, name: a.name }));

      const newLogos =
        targets.length > 0
          ? await this.logoService.getStockLogos(targets) // 내부 캐시 병합 + 공개 URL 반환
          : {};

      return named.map(a => {
        const cached = cachedLogoMap[a.symbol];
        const fromCache = cached && cached !== 'NOT_FOUND' ? cached : null;
        const fromFetch = newLogos[a.symbol] || null;
        return { ...a, logo: fromCache ?? fromFetch };
      });
    } catch (error) {
      this.logger.error(
        `Failed to enrich with logos for ${dataType}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return named;
    }
  }
}
