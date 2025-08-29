import { Asset, AssetQueryParams } from '@/financial/types';
import { Injectable } from '@nestjs/common';
import { BaseFinancialProvider } from '../financial.provider.js';

@Injectable()
export class YahooService extends BaseFinancialProvider {
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
}
