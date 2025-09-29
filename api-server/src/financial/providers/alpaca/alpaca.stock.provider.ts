import { Asset, AssetType } from '@/common/types/asset.types';
import type {
  AlpacaAsset,
  AlpacaBar,
  AlpacaBarsResponse,
  AlpacaMostActiveResponse,
  AlpacaMover,
  AlpacaMoversResponse,
  AlpacaSnapshot,
  AlpacaSnapshotsResponse,
} from '@/financial/types/alpaca.types';
import { AssetQueryParams, Candle } from '@/financial/types/common.types';
import type { Stock } from '@/financial/types/stock.types';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { BaseFinancialProvider } from '../financial.provider';
import { AlpacaClient } from './alpaca.client';

@Injectable()
export class AlpacaStockProvider extends BaseFinancialProvider {
  getTopTraded(params: AssetQueryParams): Promise<Asset[]> {
    throw new Error('Method not implemented.');
  }
  assetType = AssetType.STOCK;
  private readonly logger = new Logger(AlpacaStockProvider.name);

  constructor(private readonly alpacaClient: AlpacaClient) {
    super();
  }

  async getAssets(params: AssetQueryParams): Promise<Asset[]> {
    const searchParams = new URLSearchParams({
      status: 'active',
      asset_class: 'us_equity',
    });

    try {
      const response = await this.alpacaClient.getAssets<AlpacaAsset[]>('v2/assets', searchParams);
      return response.map(asset => ({
        assetType: AssetType.STOCK,
        symbol: asset.symbol,
        name: this.cleanCompanyName(asset.name), // 🆕 여기서 정제
        exchange: asset.exchange,
      }));
    } catch (error) {
      this.logger.error('Failed to get assets from Alpaca');
      return [];
    }
  }
  // 🎯 개별 종목 스냅샷 조회 (등락율 포함)
  async getSnapshots(params: AssetQueryParams): Promise<Stock[]> {
    if (!params.symbols || params.symbols.length === 0) {
      return [];
    }

    const searchParams = new URLSearchParams({ symbols: params.symbols.join(',') });
    try {
      const snapshots = await this.alpacaClient.getMarketData<AlpacaSnapshotsResponse>(
        'v2/stocks/snapshots',
        searchParams,
      );

      if (!snapshots) return [];
      return Object.keys(snapshots).map(symbol => this.normalizeSnapshotToStock(symbol, snapshots[symbol]));
    } catch (error) {
      this.logger.error('Failed to get snapshots from Alpaca');
      return [];
    }
  }

  // 🎯 가장 활발한 종목 + 상세 정보 조합
  async getMostActive(params: AssetQueryParams): Promise<Stock[]> {
    const searchParams = new URLSearchParams({ top: String(params.limit ?? 10) });
    try {
      // 1단계: Most Active 목록 조회 (거래량 정보)
      const mostActiveResponse = await this.alpacaClient.getMarketData<AlpacaMostActiveResponse>(
        'v1beta1/screener/stocks/most-actives',
        searchParams,
      );

      if (!mostActiveResponse.most_actives || mostActiveResponse.most_actives.length === 0) {
        return [];
      }

      // 2단계: 해당 종목들의 상세 정보 조회 (등락율 정보)
      const symbols = mostActiveResponse.most_actives.map(item => item.symbol);
      const snapshotsData = await this.getSnapshots({ ...params, symbols });

      // 3단계: 두 데이터 합치기
      return mostActiveResponse.most_actives.map(mostActiveItem => {
        const snapshotData = snapshotsData.find(snap => snap.symbol === mostActiveItem.symbol);

        return {
          ...snapshotData,
          assetType: AssetType.STOCK,
          symbol: mostActiveItem.symbol,
          volume: mostActiveItem.volume || snapshotData?.volume || null,
          currency: 'USD',
        };
      });
    } catch (error) {
      this.logger.error('Failed to get most active stocks from Alpaca');
      return [];
    }
  }

  private async _getMovers(params: AssetQueryParams): Promise<AlpacaMoversResponse> {
    const searchParams = new URLSearchParams({
      top: String(params.limit),
    });

    try {
      return await this.alpacaClient.getMarketData<AlpacaMoversResponse>(
        `v1beta1/screener/${params.assetType}/movers`,
        searchParams,
      );
    } catch (error) {
      this.logger.error('Failed to get movers data from Alpaca');
      return { gainers: [], losers: [] };
    }
  }

  async getTopGainers(params: AssetQueryParams): Promise<Stock[]> {
    const response = await this._getMovers(params);
    return response.gainers.map(item => this.normalizeToMoverToStock(item));
  }

  async getTopLosers(params: AssetQueryParams): Promise<Stock[]> {
    const response = await this._getMovers(params);
    return response.losers.map(item => this.normalizeToMoverToStock(item));
  }

  private async _getCandles(params: AssetQueryParams): Promise<AlpacaBarsResponse> {
    if (!params.timeframe) throw new BadRequestException('timeframe is required');
    if (!params.symbols || params.symbols.length === 0) throw new BadRequestException('symbols are required');

    const timeRange = this.getDefaultTimeRange(params.timeframe);
    const response = await this.alpacaClient.getMarketData<AlpacaBarsResponse>(
      'v2/stocks/bars',
      new URLSearchParams({
        symbols: params.symbols.join(','),
        timeframe: params.timeframe,
        start: timeRange.start,
        end: timeRange.end,
        adjustment: 'all',
      }),
    );

    return response;
  }

  // async getCandles(params: AssetQueryParams): Promise<Record<string, Candle[]>> {
  //   const response = await this._getCandles(params);
  //   const barsBySymbol = response?.bars ?? {};

  //   if (!params.symbols || params.symbols.length === 0) return {};

  //   const result = Object.fromEntries(
  //     params.symbols.map(symbol => {
  //       const entry = barsBySymbol[symbol];
  //       const list = !entry ? [] : Array.isArray(entry) ? entry : [entry];
  //       const candles = list.map(bar => this.normalizeToCandle(symbol, bar));
  //       return [symbol, candles] as const; // ← [key, value] 튜플 보장
  //     }),
  //   );
  //   return result;
  // }

  async getCandles(params: AssetQueryParams): Promise<Candle[]> {
    const response = await this._getCandles(params);
    const barsBySymbol = response?.bars ?? {};

    const result: Candle[] = Object.entries(barsBySymbol).flatMap(([symbol, entry]) => {
      const list = !entry ? [] : Array.isArray(entry) ? entry : [entry];
      return list.map(bar => this.normalizeToCandle(symbol, bar));
    });

    return result;
  }

  normalizeToCandle(symbol: string, data: AlpacaBar): Candle {
    return {
      symbol,
      open: data.o,
      high: data.h,
      low: data.l,
      close: data.c,
      volume: data.v,
      timestamp: data.t,
      tradeCount: data.n,
      vwap: data.vw,
    };
  }

  normalizeToMoverToStock(data: AlpacaMover): Stock {
    const mover = data;
    return {
      assetType: AssetType.STOCK,
      symbol: mover.symbol,
      price: mover.price,
      change: mover.change,
      changesPercentage: mover.percent_change / 100,
      currency: 'USD',
    };
  }

  private normalizeSnapshotToStock(symbol: string, snapshot: AlpacaSnapshot): Stock {
    const currentPrice = snapshot.latestTrade?.p || snapshot.latestQuote?.ap || 0;
    const previousClose = snapshot.prevDailyBar?.c || 0;
    const change = previousClose ? currentPrice - previousClose : 0;
    // 순수 소수(Ratio)로 계산
    const changesPercentage = previousClose ? change / previousClose : 0;

    return {
      assetType: AssetType.STOCK,
      symbol,
      price: currentPrice,
      change: parseFloat(change.toFixed(2)),
      changesPercentage: changesPercentage,
      volume: snapshot.latestTrade?.s,
      previousClose: snapshot.prevDailyBar?.c,
      currency: 'USD',
    };
  }
}
