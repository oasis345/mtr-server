import { Asset, AssetQueryParams } from '@/financial/types/common.types.js';
import { Injectable } from '@nestjs/common';
import { BaseFinancialProvider } from '../financial.provider.js';
import { AlpacaClient } from './alpaca.client.js';

@Injectable()
export class AlpacaStockProvider extends BaseFinancialProvider {
  normalizeToAsset(data: any): Asset {
    throw new Error('Method not implemented.');
  }
  getAssets(params: AssetQueryParams): Promise<Asset[]> {
    throw new Error('Method not implemented.');
  }
  getTopByMarketCap(params: AssetQueryParams): Promise<Asset[]> {
    throw new Error('Method not implemented.');
  }
  getTopByVolume(params: AssetQueryParams): Promise<Asset[]> {
    throw new Error('Method not implemented.');
  }
  getTopGainers(params: AssetQueryParams): Promise<Asset[]> {
    throw new Error('Method not implemented.');
  }
  getTopLosers(params: AssetQueryParams): Promise<Asset[]> {
    throw new Error('Method not implemented.');
  }
  constructor(private readonly alpacaClient: AlpacaClient) {
    super();
  }
}
