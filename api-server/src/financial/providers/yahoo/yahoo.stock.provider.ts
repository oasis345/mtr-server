import { Asset, AssetQueryParams, AssetType, Stock, StockQueryParams } from '@/financial/types';
import { Injectable, Logger } from '@nestjs/common';
import yahooFinance from 'yahoo-finance2';
import { BaseFinancialProvider } from '../financial.provider';

// 1. Yahoo가 제공하는 추가 데이터 필드를 인터페이스에 정의합니다.
interface YahooQuote {
  symbol: string;
  longName?: string;
  shortName?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketVolume?: number;
  marketCap?: number;
  trailingPE?: number;
  twoHundredDayAverage?: number;
  trailingAnnualDividendYield?: number;
}

@Injectable()
export class YahooStockProvider extends BaseFinancialProvider {
  assetType = AssetType.STOCK;
  getSnapshots(params: AssetQueryParams): Promise<Asset[]> {
    throw new Error('Method not implemented.');
  }
  private readonly logger = new Logger(YahooStockProvider.name);

  normalizeToAsset(quote: YahooQuote): Stock {
    return {
      assetType: AssetType.STOCK,
      symbol: quote.symbol,
      name: quote?.longName || quote?.shortName || quote.symbol,
      price: quote.regularMarketPrice ?? 0,
      change: quote.regularMarketChange ?? 0,
      changesPercentage: quote.regularMarketChangePercent ?? 0,
      volume: quote.regularMarketVolume ?? null,
    };
  }

  async getMostActive(params: StockQueryParams): Promise<Stock[]> {
    const screenerResult = await yahooFinance.screener({
      scrIds: 'most_actives',
      region: params.country,
      count: params.limit ?? 100,
    });
    const symbols = screenerResult.quotes.map(q => q.symbol);
    if (symbols.length === 0) return [];

    const quotes = await yahooFinance.quote(symbols);
    return quotes.map(q => this.normalizeToAsset(q));
  }
  async getTopGainers(params: StockQueryParams): Promise<Stock[]> {
    const screenerResult = await yahooFinance.screener({
      scrIds: 'day_gainers',
      region: params.country,
      count: params.limit ?? 100,
    });
    const symbols = screenerResult.quotes.map(q => q.symbol);
    if (symbols.length === 0) return [];

    const quotes = await yahooFinance.quote(symbols);
    return quotes.map(q => this.normalizeToAsset(q));
  }
  async getTopLosers(params: StockQueryParams): Promise<Stock[]> {
    const screenerResult = await yahooFinance.screener({
      scrIds: 'day_losers',
      region: params.country,
      count: params.limit ?? 100,
    });
    const symbols = screenerResult.quotes.map(q => q.symbol);
    if (symbols.length === 0) return [];

    const quotes = await yahooFinance.quote(symbols);
    return quotes.map(q => this.normalizeToAsset(q));
  }

  getAssets(params: StockQueryParams): Promise<Stock[]> {
    throw new Error('Method not implemented.');
  }
}
