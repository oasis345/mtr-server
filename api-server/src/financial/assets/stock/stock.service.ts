import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Cache } from 'cache-manager';
import { FinancialProvider } from '../../providers/financial.provider';
import { AssetType, MarketDataType, type AssetQueryParams } from '../../types';
import { AssetService } from '../asset.service';

@Injectable()
export class StockService extends AssetService implements OnModuleInit {
  private readonly logger = new Logger(StockService.name);
  protected readonly dataTypeMethodMap: Record<MarketDataType, keyof FinancialProvider> = {
    marketCap: 'getTopByMarketCap',
    volume: 'getTopByVolume',
    gainers: 'getTopGainers',
    losers: 'getTopLosers',
    price: 'getAssets',
  };
  // 1. AssetService가 요구하는 '구체적인 내용'을 채워줍니다.
  protected readonly cacheableDataTypes = new Set([MarketDataType.MARKET_CAP]);

  protected getCacheKey(params: AssetQueryParams): string {
    // 예시: 'stock:marketCap' 과 같이 구체적인 키를 반환
    return `${params.assetType}:${params.dataType}`;
  }

  constructor(
    @Inject('STOCK_PROVIDER') protected readonly provider: FinancialProvider,
    @Inject(CACHE_MANAGER) cacheManager: Cache,
  ) {
    super(cacheManager);
    this.logger.log(`StockService is using "${provider.constructor.name}" provider.`);
  }

  async onModuleInit() {
    this.logger.log(`StockService is initialized Provider is (${this.provider.constructor.name})`);
    await this.refreshTopMarketCapStocks();
  }

  @Cron(CronExpression.EVERY_HOUR)
  async refreshTopMarketCapStocksCron() {
    this.logger.log(
      `Scheduled cache refresh for top market cap stocks... ${this.getCacheKey({ assetType: AssetType.STOCK, dataType: MarketDataType.MARKET_CAP, limit: 100 })}`,
    );
    await this.refreshTopMarketCapStocks();
  }

  async refreshTopMarketCapStocks() {
    try {
      const params: AssetQueryParams = { assetType: AssetType.STOCK, dataType: MarketDataType.MARKET_CAP, limit: 100 };
      const freshStocks = await this.provider.getTopByMarketCap(params);
      await this.cacheManager.set(this.getCacheKey(params), freshStocks);
      this.logger.log(`Successfully refreshed and cached ${freshStocks.length} top stocks.`);
    } catch (error) {
      this.logger.error('Failed to refresh top stocks cache', error);
    }
  }
}
