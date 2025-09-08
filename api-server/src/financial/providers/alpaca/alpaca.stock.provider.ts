import type {
  AlpacaAsset,
  AlpacaMostActiveResponse,
  AlpacaMover,
  AlpacaMoversResponse,
  AlpacaSnapshotsResponse,
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
      const response = await this.alpacaClient.getAssets<AlpacaAsset[]>('v2/assets', searchParams);

      // Assets API 응답을 Stock 타입으로 변환
      return response.map(asset => ({
        assetType: AssetType.STOCK,
        symbol: asset.symbol,
        name: asset.name,
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

      return Object.keys(snapshots).map(symbol => {
        const snapshot = snapshots[symbol];

        const currentPrice = snapshot.latestTrade?.p || snapshot.latestQuote?.ap || 0;
        const previousClose = snapshot.prevDailyBar?.c || 0;
        const change = previousClose ? currentPrice - previousClose : 0;
        const changesPercentage = previousClose ? (change / previousClose) * 100 : 0;

        return {
          assetType: AssetType.STOCK,
          symbol,
          price: currentPrice,
          change: parseFloat(change.toFixed(2)),
          changesPercentage: parseFloat(changesPercentage.toFixed(2)),
          volume: snapshot.latestTrade?.s, // 거래량 추가
          previousClose: snapshot.prevDailyBar?.c,
        };
      });
    } catch (error) {
      this.logger.error('Failed to get snapshots from Alpaca');
      return [];
    }
  }

  // 🎯 가장 활발한 종목 + 상세 정보 조합
  async getMostActive(params: AssetQueryParams): Promise<Stock[]> {
    const searchParams = new URLSearchParams({ top: String(params.limit ?? 30) });
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
      const combinedData = mostActiveResponse.most_actives.map(mostActiveItem => {
        // snapshots에서 해당 종목의 등락율 정보 찾기
        const snapshotData = snapshotsData.find(snap => snap.symbol === mostActiveItem.symbol);
        const data: Stock = {
          assetType: AssetType.STOCK,
          symbol: mostActiveItem.symbol,
          price: snapshotData?.price || mostActiveItem.price || 0,
          change: snapshotData?.change || 0,
          changesPercentage: snapshotData?.changesPercentage || 0,
          volume: mostActiveItem.volume || snapshotData?.volume || null, // 🎯 거래량 우선 사용
          previousClose: snapshotData?.previousClose,
        };
        return data;
      });

      return combinedData;
    } catch (error) {
      this.logger.error('Failed to get most active stocks from Alpaca');
      return [];
    }
  }

  private async _getMovers(params: AssetQueryParams): Promise<AlpacaMoversResponse> {
    const searchParams = new URLSearchParams({
      top: String(params.limit ?? 30),
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

  normalizeToAsset(data: AlpacaMover): Stock {
    // Case 1: Movers / Most-Actives API 응답 (내부에 'symbol' 속성 존재)
    const mover = data;
    return {
      assetType: AssetType.STOCK,
      symbol: mover.symbol,
      price: mover.price,
      change: mover.change,
      changesPercentage: mover.percent_change,
    };
  }
}
