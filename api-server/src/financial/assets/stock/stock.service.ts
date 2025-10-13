import { AppCacheService } from '@/cache/cache.service';
import { Asset } from '@/common/types';
import { AssetType } from '@/common/types/asset.types';
import { AssetService } from '@/financial/assets/asset.service';
import { AssetServiceConfig } from '@/financial/config/assetConfig';
import { ProviderRegistry } from '@/financial/providers/provider.registry';
import { LogoService } from '@/financial/services/logo.service';
import { MarketDataType } from '@/financial/types';
import { Injectable } from '@nestjs/common';

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
    const withNamed = await this.enrichName(assets);

    // 2) 로고 보강 조건 확인
    const withLogo = this.config.cacheableDataTypeMap.get(dataType)?.withLogo ?? false;
    const MAX_LOGO_FETCH = 100;
    if (!withLogo || !this.logoService || withNamed.length > MAX_LOGO_FETCH) {
      if (withLogo && withNamed.length > MAX_LOGO_FETCH) {
        this.logger.warn(`Skipping logo fetch: too many assets (${withNamed.length}) for dataType: ${dataType}`);
      }
      return withNamed;
    }

    // 3) 로고 보강
    try {
      const cachedLogoMap = await this.logoService.getLogoMap();
      const targets = withNamed.filter(a => !cachedLogoMap[a.symbol]).map(a => ({ symbol: a.symbol, name: a.name }));

      const newLogos =
        targets.length > 0
          ? await this.logoService.getStockLogos(targets) // 내부 캐시 병합 + 공개 URL 반환
          : {};

      return withNamed.map(a => {
        const cached = cachedLogoMap[a.symbol];
        const fromCache = cached && cached !== 'NOT_FOUND' ? cached : null;
        const fromFetch = newLogos[a.symbol] || null;
        return { ...a, logo: fromCache ?? fromFetch };
      });
    } catch (error) {
      this.logger.error(
        `Failed to enrich with logos for ${dataType}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return withNamed;
    }
  }
}
