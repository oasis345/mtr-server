import type { Asset, AssetQueryParams, AssetType } from '../types';

export const FINANCIAL_PROVIDER = 'FINANCIAL_PROVIDER';

export interface FinancialProvider {
  assetType: AssetType;
  // 자산 조회
  getAssets(params: AssetQueryParams): Promise<Asset[]>;
  // 종목 스냅샷 조회
  getSnapshots(params: AssetQueryParams): Promise<Asset[]>;
  // 가장 활발한 종목
  getMostActive(params: AssetQueryParams): Promise<Asset[]>;
  //상승 종목
  getTopGainers(params: AssetQueryParams): Promise<Asset[]>;
  //하락 종목
  getTopLosers(params: AssetQueryParams): Promise<Asset[]>;
}

export abstract class BaseFinancialProvider implements FinancialProvider {
  abstract assetType: AssetType;
  abstract normalizeToAsset(data: any): Asset;
  abstract getAssets(params: AssetQueryParams): Promise<Asset[]>;
  abstract getSnapshots(params: AssetQueryParams): Promise<Asset[]>;
  abstract getMostActive(params: AssetQueryParams): Promise<Asset[]>;
  abstract getTopGainers(params: AssetQueryParams): Promise<Asset[]>;
  abstract getTopLosers(params: AssetQueryParams): Promise<Asset[]>;

  protected sortByVolume(assets: Asset[], limit: number): Asset[] {
    return assets
      .filter(asset => asset.volume && asset.volume > 0)
      .sort((a, b) => (b.volume || 0) - (a.volume || 0))
      .slice(0, limit);
  }
}
