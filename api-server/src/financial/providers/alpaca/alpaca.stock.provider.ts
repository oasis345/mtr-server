import { Asset, AssetType, Candle, Trade } from '@/common/types/asset.types';
import { getErrorMessage } from '@/common/utils/error';
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
import { AssetQueryParams, CandleQueryParams, CandleResponse } from '@/financial/types/common.types';
import type { Stock } from '@/financial/types/stock.types';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as _ from 'lodash';
import { BaseFinancialProvider } from '../financial.provider';
import { AlpacaClient } from './alpaca.client';

@Injectable()
export class AlpacaStockProvider extends BaseFinancialProvider {
  id = 'alpaca';
  assetType = AssetType.STOCK;
  private readonly logger = new Logger(AlpacaStockProvider.name);

  constructor(private readonly alpacaClient: AlpacaClient) {
    super();
  }

  getTrades(params: AssetQueryParams): Promise<Trade[]> {
    throw new Error('Method not implemented.');
  }

  getTopTraded(params: AssetQueryParams): Promise<Asset[]> {
    throw new Error('Method not implemented.');
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
      this.logger.error('Failed to get assets from Alpaca', getErrorMessage(error));
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
      this.logger.error('Failed to get snapshots from Alpaca', getErrorMessage(error));
      return [];
    }
  }

  // 🎯 가장 활발한 종목 + 상세 정보 조합
  async getMostActive(params: AssetQueryParams): Promise<Stock[]> {
    const searchParams = new URLSearchParams({ top: String(params.limit ?? 100) });
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
      this.logger.error('Failed to get most active stocks from Alpaca', getErrorMessage(error));
      return [];
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

  async getCandles(params: CandleQueryParams): Promise<CandleResponse> {
    const response = await this._getCandles(params);
    const barsBySymbol = response?.bars ?? {};
    const [symbol] = params.symbols;

    const raw = barsBySymbol[symbol];
    const list = !raw ? [] : Array.isArray(raw) ? raw : [raw];

    const candles = list.map(bar => this.normalizeToCandle(symbol, bar));
    candles.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const withChange = this.addChangePercentage(candles);

    const limit = params.limit ?? 100;
    const data = withChange.slice(0, limit);

    // limit+1개보다 적은 데이터를 반환했다면, 더 이상 과거 데이터가 없다는 뜻이므로 nextDateTime은 null이 됩니다.
    const nextDateTime =
      withChange.length > limit && data.length
        ? new Date(new Date(data[data.length - 1].timestamp).getTime() - 1).toISOString()
        : null;

    return { candles: data, nextDateTime };
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
      assetType: AssetType.STOCK,
      currency: 'USD',
    };
  }

  normalizeToMoverToStock(data: AlpacaMover): Stock {
    const mover = data;
    return {
      assetType: AssetType.STOCK,
      symbol: mover.symbol,
      price: mover.price,
      change: mover.change,
      changePercentage: mover.percent_change / 100,
      currency: 'USD',
    };
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
      this.logger.error('Failed to get movers data from Alpaca', getErrorMessage(error));
      return { gainers: [], losers: [] };
    }
  }

  private getPeriodMs(timeframe: string): number {
    const match = timeframe.match(/^(\d+)([a-zA-Z]+)$/);
    if (!match) return 24 * 60 * 60 * 1000; // 기본값 1일

    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    const dayMs = 24 * 60 * 60 * 1000;

    if (unit.startsWith('min')) return value * 60 * 1000;
    if (unit.startsWith('h')) return value * 60 * 60 * 1000;
    if (unit.startsWith('d')) return value * dayMs;
    if (unit.startsWith('w')) return value * 7 * dayMs;
    if (unit.startsWith('m')) return value * 30 * dayMs; // 근사치

    return dayMs;
  }

  private async _getCandles(params: CandleQueryParams): Promise<AlpacaBarsResponse> {
    if (!params.timeframe) throw new BadRequestException('timeframe is required');
    if (!params.symbols || params.symbols.length === 0) throw new BadRequestException('symbols are required');

    const sp = new URLSearchParams();
    sp.set('symbols', params.symbols.join(','));
    sp.set('timeframe', params.timeframe);
    sp.set('adjustment', 'all');
    sp.set('sort', 'desc');

    // 등락율 계산을 위한 추가 캔들 요청
    const limit = params.limit ?? 100;
    const itemsToFetch = limit + 1;
    sp.set('limit', itemsToFetch.toString());
    sp.set('feed', 'iex');

    // --- ❗️ 핵심 수정: 동적 슬라이딩 윈도우 로직 적용 ---
    let effectiveEnd: string;
    let effectiveStart: string;

    if (params.start) {
      // 두 번째 호출부터: client가 보낸 start(nextDateTime)가 새로운 end가 됨 Alpaca 호환을 위해
      effectiveEnd = params.start;
    } else {
      // 첫 호출: 기본 end 사용
      const timeRange = this.getDefaultTimeRange(params.timeframe);
      effectiveEnd = timeRange.end;
    }

    // end를 기준으로, 요청할 limit을 커버할 수 있는 작은 크기의 start를 동적으로 계산
    const endDate = new Date(effectiveEnd);
    const periodMs = this.getPeriodMs(params.timeframe);
    // 주말, 휴장일 등을 고려하여 넉넉하게 기간 설정 (1.5배)
    const durationMs = itemsToFetch * periodMs * 1.5;
    const startDate = new Date(endDate.getTime() - durationMs);
    effectiveStart = startDate.toISOString();

    sp.set('start', effectiveStart);
    sp.set('end', effectiveEnd);

    try {
      const response = await this.alpacaClient.getMarketData<AlpacaBarsResponse>('v2/stocks/bars', sp);
      while (response.next_page_token) {
        response.next_page_token = response.next_page_token ?? null;

        const enough = params.symbols.every(sym => {
          const arr = Array.isArray(response.bars?.[sym])
            ? (response.bars as any)[sym]
            : response.bars?.[sym]
              ? [(response.bars as any)[sym]]
              : [];
          return arr.length >= itemsToFetch;
        });
        if (enough) break;

        sp.set('page_token', response.next_page_token);
        const nextResponse = await this.alpacaClient.getMarketData<AlpacaBarsResponse>('v2/stocks/bars', sp);
        response.bars = _.mergeWith(response.bars, nextResponse.bars, (objValue, srcValue) =>
          objValue.concat(srcValue),
        );
      }

      return response;
    } catch (error) {
      this.logger.error('Failed to get candles from Alpaca', getErrorMessage(error));
      this.logger.debug(`Alpaca request on error: ${sp.toString()}`);
      throw new BadRequestException('failed to get candles from Alpaca');
    }
  }

  private addChangePercentage(candles: Candle[]): Candle[] {
    return candles.map((c, i, arr) => {
      const prev = arr[i + 1]; // 직전(하루 전) 캔들
      const pct = prev?.close ? (c.close - prev.close) / prev.close : (c.close - c.open) / c.open; // 캔들이 하루 이상 차이나면 전일 종가로 계산 마지막 캔들은 시가 종가로 계산
      return { ...c, changePercentage: pct };
    });
  }

  private normalizeSnapshotToStock(symbol: string, snapshot: AlpacaSnapshot): Stock {
    const currentPrice = snapshot.latestTrade?.p || snapshot.latestQuote?.ap || 0;
    const previousClose = snapshot.prevDailyBar?.c || 0;
    const change = previousClose ? currentPrice - previousClose : 0;
    // 순수 소수(Ratio)로 계산
    const changePercentage = previousClose ? change / previousClose : 0;

    return {
      assetType: AssetType.STOCK,
      symbol,
      price: currentPrice,
      change: parseFloat(change.toFixed(2)),
      changePercentage: changePercentage, // 여기도 함께 수정 (changePercentage -> changePercentage)
      volume: snapshot.latestTrade?.s,
      previousClose: snapshot.prevDailyBar?.c,
      currency: 'USD',
    };
  }
}
