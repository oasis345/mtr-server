import type {
  AlpacaLatestQuotesResponse,
  AlpacaMostActiveResponse,
  AlpacaMover,
  AlpacaMoversResponse,
  AlpacaQuote,
} from '@/financial/types/alpaca.types';
import { AssetQueryParams, AssetType } from '@/financial/types/common.types';
import type { Stock } from '@/financial/types/stock.types';
import { Injectable, Logger } from '@nestjs/common';
import { BaseFinancialProvider } from '../financial.provider';
import { AlpacaClient } from './alpaca.client';

@Injectable()
export class AlpacaStockProvider extends BaseFinancialProvider {
  assetType = AssetType.STOCK;
  private readonly logger = new Logger(AlpacaStockProvider.name);

  constructor(private readonly alpacaClient: AlpacaClient) {
    super();
  }

  // [수정] Assets API를 사용하여 모든 주식 자산 정보를 가져옵니다.
  async getAssets(params: AssetQueryParams): Promise<Stock[]> {
    const searchParams = new URLSearchParams({
      status: 'active',
      asset_class: 'us_equity',
    });

    if (params.limit) {
      searchParams.set('limit', String(params.limit));
    }

    try {
      // Assets API는 ASSET Base URL을 사용해야 합니다.
      const response = await this.alpacaClient.getAssets<any[]>('v2/assets', searchParams);

      // Assets API 응답을 Stock 타입으로 변환
      return response.map(asset => ({
        assetType: AssetType.STOCK,
        symbol: asset.symbol,
        name: asset.name || asset.symbol,
        price: 0, // Assets API는 가격 정보를 제공하지 않음
        change: 0,
        changesPercentage: 0,
        volume: null,
      }));
    } catch (error) {
      this.logger.error('Failed to get assets from Alpaca', error);
      return [];
    }
  }

  // [기존 메서드들은 Market Data API를 사용하므로 그대로 유지]
  async getQuotes(params: AssetQueryParams): Promise<Stock[]> {
    if (!params.symbols || params.symbols.length === 0) {
      return [];
    }
    const searchParams = new URLSearchParams({ symbols: params.symbols.join(',') });
    try {
      // Market Data API 사용
      const response = await this.alpacaClient.getMarketData<AlpacaLatestQuotesResponse>(
        'v2/stocks/quotes/latest',
        searchParams,
      );
      const quotes = response.quotes;
      if (!quotes) return [];

      return Object.keys(quotes).map(symbol => this.normalizeToAsset(quotes[symbol], symbol));
    } catch (error) {
      this.logger.error('Failed to get quotes from Alpaca', error);
      return [];
    }
  }

  async getMostActive(params: AssetQueryParams): Promise<Stock[]> {
    const searchParams = new URLSearchParams({ top: String(params.limit ?? 100) });
    try {
      // Market Data API 사용
      const response = await this.alpacaClient.getMarketData<AlpacaMostActiveResponse>(
        'v1beta1/screener/stocks/most-actives',
        searchParams,
      );
      const data = await this.getQuotes({ ...params, symbols: response.most_actives.map(item => item.symbol) });
      return data;
    } catch (error) {
      this.logger.error('Failed to get most active stocks from Alpaca', error);
      return [];
    }
  }

  private async _getMovers(params: AssetQueryParams): Promise<AlpacaMoversResponse> {
    const searchParams = new URLSearchParams({
      top: String(params.limit ?? 50),
    });

    try {
      // Market Data API 사용
      return await this.alpacaClient.getMarketData<AlpacaMoversResponse>(
        `v1beta1/screener/${params.assetType}/movers`,
        searchParams,
      );
    } catch (error) {
      this.logger.error('Failed to get movers data from Alpaca', error);
      return { gainers: [], losers: [] };
    }
  }

  async getTopGainers(params: AssetQueryParams): Promise<Stock[]> {
    const response = await this._getMovers(params);
    return response.gainers.map(item => this.normalizeToAsset(item));
  }

  async getTopLosers(params: AssetQueryParams): Promise<Stock[]> {
    const response = await this._getMovers(params);
    return response.losers.map(item => this.normalizeToAsset(item));
  }

  // --- 통합된 단일 Normalization 메서드 ---
  normalizeToAsset(data: AlpacaMover | AlpacaQuote, symbolFromKey?: string): Stock {
    // Case 1: Movers / Most-Actives API 응답 (내부에 'symbol' 속성 존재)
    if ('symbol' in data) {
      const mover = data;
      return {
        assetType: AssetType.STOCK,
        symbol: mover.symbol,
        name: mover.symbol,
        price: mover.price,
        change: mover.change || 0,
        changesPercentage: mover.percent_change || 0,
        volume: null,
      };
    }

    // Case 2: Quotes API 응답 (symbol이 key로 별도 전달됨)
    if (symbolFromKey && 'ap' in data) {
      const quote = data;
      return {
        assetType: AssetType.STOCK,
        symbol: symbolFromKey,
        name: symbolFromKey,
        price: quote.ap, // Ask Price
        change: 0, // 정보 없음
        changesPercentage: 0, // 정보 없음
        volume: null, // 정보 없음
      };
    }

    throw new Error('Unsupported data structure for Alpaca asset normalization.');
  }
}
