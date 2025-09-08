import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { FINANCIAL_PROVIDER, FinancialProvider } from '../../providers/financial.provider';
import { AssetQueryParams, AssetType, MarketDataType } from '../../types';
import { AssetService } from '../asset.service';

@Injectable()
export class StockService extends AssetService {
  protected readonly assetType = AssetType.STOCK;
  protected readonly dataTypeMethodMap: Record<MarketDataType, keyof FinancialProvider> = {
    [MarketDataType.ASSETS]: 'getAssets',
    [MarketDataType.MOST_ACTIVE]: 'getMostActive',
    [MarketDataType.GAINERS]: 'getTopGainers',
    [MarketDataType.LOSERS]: 'getTopLosers',
  };

  protected readonly cacheableDataTypes = new Set(Object.values(MarketDataType));
  protected getCacheKey(params: AssetQueryParams): string {
    return `stocks:${params.dataType}`;
  }

  constructor(
    @Inject(FINANCIAL_PROVIDER) protected readonly providerMap: Map<AssetType, FinancialProvider>,
    @Inject(CACHE_MANAGER) cacheManager: Cache,
  ) {
    super(cacheManager);
  }
}
