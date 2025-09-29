import { Asset, AssetType } from '@/common/types/asset.types';
import { AssetQueryParams, Candle, type Stock, type StockQueryParams } from '@/financial/types';
import { FMP_FREE_TIER_SYMBOLS } from '@/financial/types/fmp.types';
import { Injectable, Logger } from '@nestjs/common';
import { BaseFinancialProvider } from '../financial.provider';
import { FmpClient } from './fmp.client';

// 1. FMP API가 반환하는 다양한 형태의 raw 데이터를 포괄하는 타입을 정의합니다.
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
  getCandles(params: AssetQueryParams): Promise<Candle[]> {
    throw new Error('Method not implemented.');
  }
  assetType = AssetType.STOCK;
  getSnapshots(params: AssetQueryParams): Promise<Asset[]> {
    throw new Error('Method not implemented.');
  }
  private readonly logger = new Logger(FmpStockProvider.name);

  constructor(private readonly fmpClient: FmpClient) {
    super();
  }

  normalizeToAsset(rawData: FmpRawStockData): Stock {
    const name = rawData.companyName || rawData.name || '';
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
    };
  }

  getAssets(params: StockQueryParams): Promise<Stock[]> {
    throw new Error('Method not implemented.');
  }

  async getTopTraded(params: StockQueryParams): Promise<Stock[]> {
    const rawData = await this.fmpClient.get<FmpRawStockData[]>('stock_market/actives');
    return rawData.slice(0, params.limit).map(stock => this.normalizeToAsset(stock));
  }

  async getMostActive(params: StockQueryParams): Promise<Stock[]> {
    try {
      // const allStocks = await this.fmpClient.get<FmpStockListItem[]>('stock/list');
      // const usStocks = allStocks.filter(
      //   stock =>
      //     stock.exchangeShortName === 'NYSE' ||
      //     stock.exchangeShortName === 'NASDAQ' ||
      //     stock.exchangeShortName === 'AMEX',
      // );

      // if (usStocks.length === 0) {
      //   this.logger.warn('No stocks found from the stock list.');
      //   return [];
      // }

      // const symbols = usStocks.map(stock => stock.symbol);
      const quoteData = await this.fmpClient.get<FmpRawStockData[]>(`quote?symbol=${FMP_FREE_TIER_SYMBOLS.join(',')}`);

      const sortedByMarketCap = quoteData
        .filter(stock => stock.marketCap && stock.marketCap > 0)
        .sort((a, b) => b.marketCap - a.marketCap);

      // 4. 변경된 메서드 이름을 사용하여 명시적으로 매핑합니다.
      const topStocks = sortedByMarketCap.slice(0, params.limit).map(stock => this.normalizeToAsset(stock));

      this.logger.log(`Successfully fetched and sorted ${topStocks.length} top market cap stocks.`);
      return topStocks;
    } catch (error: any) {
      return [];
    }
  }

  // 5. 다른 메서드들도 raw 데이터를 받아와 정규화하는 안전한 방식으로 수정합니다.
  async getTopByVolume(params: StockQueryParams): Promise<Stock[]> {
    const rawData = await this.fmpClient.get<FmpRawStockData[]>('stock_market/actives');
    return rawData.slice(0, params.limit).map(stock => this.normalizeToAsset(stock));
  }

  async getTopGainers(params: StockQueryParams): Promise<Stock[]> {
    const rawData = await this.fmpClient.get<FmpRawStockData[]>('stock_market/gainers');
    return rawData.slice(0, params.limit).map(stock => this.normalizeToAsset(stock));
  }

  async getTopLosers(params: StockQueryParams): Promise<Stock[]> {
    const rawData = await this.fmpClient.get<FmpRawStockData[]>('stock_market/losers');
    return rawData.slice(0, params.limit).map(stock => this.normalizeToAsset(stock));
  }
}
