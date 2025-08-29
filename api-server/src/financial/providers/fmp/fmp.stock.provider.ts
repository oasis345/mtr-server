import { AssetType, type Asset, type Stock, type StockQueryParams } from '@/financial/types';
import { Injectable } from '@nestjs/common';
import { BaseFinancialProvider } from '../financial.provider.js';
import { FmpClient } from './fmp.client.js';

type FmpRawStockData = {
  symbol: string;
  name?: string;
  companyName?: string;
  price: number;
  change?: number;
  changesPercentage?: number;
  volume?: number;
  marketCap?: number;
};

@Injectable()
export class FmpStockProvider extends BaseFinancialProvider {
  constructor(private readonly fmpClient: FmpClient) {
    super();
  }

  /**
   * FMP의 stock-screener API에 맞는 파라미터를 생성하는 헬퍼 메서드입니다.
   * 정렬 기준(sortBy)과 순서(order)를 동적으로 추가할 수 있습니다.
   */
  private createScreenerParams(params: StockQueryParams): URLSearchParams {
    const { limit = 100, country = 'US', exchange, orderBy = params.dataType + ':desc' } = params;
    const queryParams = new URLSearchParams();

    if (limit) queryParams.set('limit', limit.toString());
    if (country) queryParams.set('country', country);
    if (exchange) {
      // 파라미터로 exchange가 들어오면 그대로 사용합니다.
      queryParams.set('exchange', exchange);
    } else if (country === 'US') {
      // country가 'US'인 경우, 미국의 대표 거래소들을 지정해줍니다.
      queryParams.set('exchange', 'NASDAQ,NYSE,AMEX');
    }

    queryParams.set('orderby', orderBy);

    return queryParams;
  }

  getAssets(params: StockQueryParams): Promise<Stock[]> {
    throw new Error('Method not implemented.');
  }

  normalizeToAsset(rawData: FmpRawStockData): Asset {
    // FMP는 'name'과 'companyName' 필드를 혼용하므로 둘 다 확인합니다.
    const name = rawData.companyName || rawData.name || '';

    // 전일 대비 변동(change)과 등락률(changesPercentage)은 일부 API에만 존재하므로,
    // 값이 없으면 0으로 기본값을 설정합니다.
    const change = rawData.change ?? 0;
    const changesPercentage = rawData.changesPercentage ?? 0;

    return {
      assetType: AssetType.STOCK,
      symbol: rawData.symbol,
      name,
      price: rawData.price,
      change,
      changesPercentage,
      volume: rawData.volume ?? null,
      marketCap: rawData.marketCap ?? null,
    };
  }

  async getTopByMarketCap(params: StockQueryParams): Promise<Asset[]> {
    const screenerParams = this.createScreenerParams(params);
    screenerParams.set('isEtf', 'false');
    screenerParams.set('isFund', 'false');
    const screenerData = await this.fmpClient.get<FmpRawStockData[]>('stock-screener', screenerParams);

    if (screenerData.length === 0) {
      return [];
    }

    const symbols = screenerData.map(stock => stock.symbol);

    const quoteData = await this.fmpClient.get<FmpRawStockData[]>(`quote/${symbols.join(',')}`);
    return quoteData.map((rawData: FmpRawStockData) => this.normalizeToAsset(rawData));
  }

  async getTopByVolume(params: StockQueryParams): Promise<Asset[]> {
    return this.fmpClient.get<Stock[]>('stock_market/actives');
  }

  async getTopGainers(params: StockQueryParams): Promise<Asset[]> {
    return this.fmpClient.get<Stock[]>('stock_market/gainers');
  }

  async getTopLosers(params: StockQueryParams): Promise<Asset[]> {
    return this.fmpClient.get<Stock[]>('stock_market/losers');
  }
}
