import { AssetType } from '@/common/types/asset.types';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { FINANCIAL_PROVIDER, FinancialProvider } from '../../providers/financial.provider';
import { AssetQueryParams, AssetServiceConfig } from '../../types';
import { AssetService } from '../asset.service';

@Injectable()
export class StockService extends AssetService {
  protected readonly assetType = AssetType.STOCK;

  protected getCacheKey(params: AssetQueryParams): string {
    return `stocks:${params.dataType}`;
  }

  constructor(
    @Inject(FINANCIAL_PROVIDER) protected readonly providerMap: Map<AssetType, FinancialProvider>,
    @Inject(CACHE_MANAGER) cacheManager: Cache,
    @Inject('ASSET_SERVICE_CONFIG') cfg: AssetServiceConfig, // 주입된 설정 사용
  ) {
    super(cacheManager, cfg);
  }
}
