import type { Asset, AssetQueryParams } from '../types';

export interface FinancialProvider {
  // 모든 종목 조회
  getAssets(params: AssetQueryParams): Promise<Asset[]>;
  // 시가총액 상위
  getTopByMarketCap(params: AssetQueryParams): Promise<Asset[]>;
  //거래 대금 상위
  getTopByVolume(params: AssetQueryParams): Promise<Asset[]>;
  //상승 종목
  getTopGainers(params: AssetQueryParams): Promise<Asset[]>;
  //하락 종목
  getTopLosers(params: AssetQueryParams): Promise<Asset[]>;
}

export abstract class BaseFinancialProvider implements FinancialProvider {
  abstract normalizeToAsset(data: any): Asset;
  abstract getAssets(params: AssetQueryParams): Promise<Asset[]>;
  abstract getTopByMarketCap(params: AssetQueryParams): Promise<Asset[]>;
  abstract getTopByVolume(params: AssetQueryParams): Promise<Asset[]>;
  abstract getTopGainers(params: AssetQueryParams): Promise<Asset[]>;
  abstract getTopLosers(params: AssetQueryParams): Promise<Asset[]>;

  // ✅ 공통 유틸리티 메서드들
  protected sortByMarketCap(assets: Asset[], limit: number): Asset[] {
    return assets
      .filter(asset => asset.marketCap && asset.marketCap > 0)
      .sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))
      .slice(0, limit);
  }

  protected sortByVolume(assets: Asset[], limit: number): Asset[] {
    return assets
      .filter(asset => asset.volume && asset.volume > 0)
      .sort((a, b) => (b.volume || 0) - (a.volume || 0))
      .slice(0, limit);
  }

  protected sortByPriceChange(assets: Asset[], limit: number, type: 'gainers' | 'losers'): Asset[] {
    return assets
      .filter(asset => asset.changesPercentage !== undefined)
      .sort((a, b) => {
        const aChange = a.changesPercentage || 0;
        const bChange = b.changesPercentage || 0;
        return type === 'gainers' ? bChange - aChange : aChange - bChange;
      })
      .slice(0, limit);
  }
}
