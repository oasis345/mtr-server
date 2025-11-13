import { AssetType } from '@/common/types';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ASSET_CONFIGS, AssetServiceConfig } from '../config/assetConfig';
import { AssetQueryParams, MarketDataType } from '../types';
import { FINANCIAL_PROVIDERS, FinancialProvider } from './financial.provider';

@Injectable()
export class ProviderRegistry {
  private readonly providerMap: FinancialProvider[] = [];
  private readonly configMap = new Map<AssetType, AssetServiceConfig>();

  constructor(
    @Inject(FINANCIAL_PROVIDERS) providers: FinancialProvider[],
    @Inject(ASSET_CONFIGS) configs: AssetServiceConfig[],
  ) {
    providers.forEach(provider => this.providerMap.push(provider));
    configs.forEach(config => this.configMap.set(config.assetType, config));
  }

  async call<T = any>(assetType: AssetType, dataType: MarketDataType, params: AssetQueryParams): Promise<T> {
    const config = this.configMap.get(assetType);
    const method = config?.dataTypeMethodMap.get(dataType);
    if (!method) throw new BadRequestException(`Unsupported dataType: "${dataType}" for "${assetType}"`);

    const provider = this.providerMap.find((provider: FinancialProvider) => {
      if (method.providerId) return provider.assetType === assetType && provider.id === method.providerId;
      else return provider.assetType === assetType;
    });

    if (!provider) throw new BadRequestException(`Unsupported Provider: "${method.providerId}" for "${assetType}"`);
    const providerMethod = provider[method.name] as (params: AssetQueryParams) => Promise<T>;
    return (await providerMethod.call(provider, params)) as T;
  }
}
