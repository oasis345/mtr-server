import { BadRequestException } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { FinancialProvider } from '../providers/financial.provider';
import { Asset, AssetQueryParams, MarketDataType } from '../types';

export abstract class AssetService {
  // 자식 클래스가 반드시 provider를 구현하도록 강제합니다.
  protected abstract readonly provider: FinancialProvider;
  protected abstract readonly dataTypeMethodMap: Record<string, keyof FinancialProvider>;
  protected abstract readonly cacheableDataTypes: Set<MarketDataType>;
  protected abstract getCacheKey(params: AssetQueryParams): string;

  constructor(protected readonly cacheManager: Cache) {}
  /**
   * 이 메서드는 이제 final(구현 완료) 버전이며, 자식 클래스는 이를 상속받아 그대로 사용합니다.
   */
  async getMarketData(params: AssetQueryParams): Promise<Asset[]> {
    const isCacheable = this.cacheableDataTypes.has(params.dataType);
    // 3-1. 이 데이터 타입이 캐싱 대상인지 확인합니다.
    if (isCacheable) {
      const cacheKey = this.getCacheKey(params);
      const cachedData = await this.cacheManager.get<Asset[]>(cacheKey);

      if (cachedData) {
        // Cache HIT: 캐시된 데이터를 즉시 반환
        return cachedData;
      }
    }

    // Cache MISS 또는 캐싱 대상이 아닌 경우: Provider를 통해 데이터 조회
    const methodName = this.dataTypeMethodMap[params.dataType];
    if (!methodName) {
      throw new BadRequestException(`Unsupported data type: "${params.dataType}"`);
    }

    const freshData = await this.provider[methodName](params);

    // 3-2. 조회 후, 캐싱 대상이었다면 캐시에 저장합니다.
    if (isCacheable) {
      const cacheKey = this.getCacheKey(params);
      await this.cacheManager.set(cacheKey, freshData);
    }

    return freshData;
  }
}
