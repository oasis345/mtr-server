import { CacheTTL } from '@/common/constants/cache.constants';
import { AssetType } from '@/common/types/asset.types';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { FINANCIAL_PROVIDER, FinancialProvider } from '../../providers/financial.provider';
import { AssetQueryParams, CacheConfig, DataTypeMethodMap, MarketDataType } from '../../types';
import { AssetService } from '../asset.service';

@Injectable()
export class CryptoService extends AssetService {
  protected readonly assetType = AssetType.CRYPTO;

  protected readonly dataTypeMethodMap: DataTypeMethodMap = new Map([
    [MarketDataType.ASSETS, 'getAssets'],
    [MarketDataType.TOP_TRADED, 'getTopTraded'],
  ]);

  // ✅ 암호화폐 전용 캐시 정책
  protected readonly cacheableDataTypeMap: Map<MarketDataType, CacheConfig> = new Map([
    [
      MarketDataType.ASSETS,
      {
        ttl: CacheTTL.EVERY_12_HOURS,
        refreshInterval: 'EVERY_12_HOURS',
        reason: '암호화폐 목록은 거의 변하지 않음',
      },
    ],
    [
      MarketDataType.TOP_TRADED,
      {
        ttl: CacheTTL.ONE_MINUTE,
        refreshInterval: 'EVERY_MINUTE',
        reason: '전체 티커 데이터 캐시, 거래량 정렬은 실시간',
      },
    ],
  ]);

  protected getCacheKey(params: AssetQueryParams): string {
    // ✅ 암호화폐는 티커 데이터만 캐시
    if (params.dataType === MarketDataType.ASSETS) {
      return `crypto:${params.dataType}`;
    }
    return `crypto:tickers`; // 모든 정렬이 같은 티커 데이터 사용
  }

  // ✅ 암호화폐별 기본 limit 설정
  protected getDefaultLimit(dataType: MarketDataType): number {
    const cryptoLimits = {
      [MarketDataType.TOP_TRADED]: 200,
    };

    return cryptoLimits[dataType] || 100;
  }

  constructor(
    @Inject(FINANCIAL_PROVIDER) protected readonly providerMap: Map<AssetType, FinancialProvider>,
    @Inject(CACHE_MANAGER) cacheManager: Cache,
  ) {
    super(cacheManager);
  }
}
