import { AssetType } from '@/common/types';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ASSET_CONFIGS, AssetServiceConfig } from '../config/assetConfig';
import { AssetQueryParams, MarketDataType } from '../types';
import { FINANCIAL_PROVIDERS, FinancialProvider } from './financial.provider';

@Injectable()
export class ProviderRegistry {
  private readonly providerMap = new Map<AssetType, FinancialProvider>();
  private readonly configMap = new Map<AssetType, AssetServiceConfig>();

  constructor(
    @Inject(FINANCIAL_PROVIDERS) providers: FinancialProvider[],
    @Inject(ASSET_CONFIGS) configs: AssetServiceConfig[],
  ) {
    providers.forEach(provider => this.providerMap.set(provider.assetType, provider));
    configs.forEach(config => this.configMap.set(config.assetType, config));
  }

  getProviderOrThrow(type: AssetType): FinancialProvider {
    const provider = this.providerMap.get(type);
    if (!provider) throw new BadRequestException(`Unsupported asset type: "${type}"`);
    return provider;
  }

  getMethodNameOrThrow(assetType: AssetType, dataType: MarketDataType): keyof FinancialProvider {
    const config = this.configMap.get(assetType);
    const name = config?.dataTypeMethodMap.get(dataType);
    if (!name) throw new BadRequestException(`Unsupported dataType: "${dataType}" for "${assetType}"`);
    return name;
  }

  async call<T = any>(assetType: AssetType, dataType: MarketDataType, params: AssetQueryParams): Promise<T> {
    const provider = this.getProviderOrThrow(assetType);
    const methodName = this.getMethodNameOrThrow(assetType, dataType);
    const method = provider[methodName] as (params: AssetQueryParams) => Promise<T>;
    return (await method.call(provider, params)) as T;
  }
}
