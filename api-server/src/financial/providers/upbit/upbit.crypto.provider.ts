import { CustomHttpService } from '@/common/http/http.service';
import { Asset, AssetType } from '@/common/types';
import { Injectable, Logger } from '@nestjs/common';
import { AssetQueryParams, CandleQueryParams, CandleResponse } from '../../types';
import { UpbitMarket, UpbitTicker } from '../../types/upbit.type';
import { FinancialProvider } from '../financial.provider';

@Injectable()
export class UpbitCryptoProvider implements FinancialProvider {
  assetType = AssetType.CRYPTO;
  private readonly baseUrl = 'https://api.upbit.com/v1';
  private readonly logger = new Logger(UpbitCryptoProvider.name);

  constructor(private readonly httpService: CustomHttpService) {}
  getCandles(params: CandleQueryParams): Promise<CandleResponse> {
    throw new Error('Method not implemented.');
  }

  private async loadKrwMarkets(): Promise<string[]> {
    const markets: UpbitMarket[] = await this.httpService.get<UpbitMarket[]>(`${this.baseUrl}/market/all`);
    const krwMarkets = markets.filter(market => market.market.startsWith('KRW-')).map(market => market.market);
    this.logger.log(`Loaded ${krwMarkets.length} KRW markets`);
    return krwMarkets;
  }

  async getAssets(params: AssetQueryParams): Promise<Asset[]> {
    const markets: UpbitMarket[] = await this.httpService.get<UpbitMarket[]>(`${this.baseUrl}/market/all`);
    return markets.filter(market => market.market.startsWith('KRW-')).map(market => this.normalizeToAsset(market));
  }

  // ✅ 공통 티커 데이터 조회 메서드
  private async getTickersData(): Promise<UpbitTicker[]> {
    const data = await this.loadKrwMarkets();
    const markets = data.join(',');
    return await this.httpService.get<UpbitTicker[]>(`${this.baseUrl}/ticker?markets=${markets}`);
  }

  async getTopTraded(params: AssetQueryParams): Promise<Asset[]> {
    const tickers = await this.getTickersData();
    return tickers
      .sort((a, b) => b.acc_trade_price_24h - a.acc_trade_price_24h)
      .slice(0, params.limit || 10)
      .map(ticker => this.normalizeToAsset(ticker));
  }

  async getMostActive(params: AssetQueryParams): Promise<Asset[]> {
    // ✅ 전체 티커 데이터 조회 후 거래량 정렬
    const tickers = await this.getTickersData();

    return tickers
      .sort((a, b) => b.acc_trade_volume_24h - a.acc_trade_volume_24h)
      .slice(0, params.limit || 10)
      .map(ticker => this.normalizeToAsset(ticker));
  }

  async getTopGainers(params: AssetQueryParams): Promise<Asset[]> {
    // ✅ 전체 티커 데이터 조회 후 상승률 정렬
    const tickers = await this.getTickersData();

    return tickers
      .sort((a, b) => b.signed_change_rate - a.signed_change_rate)
      .slice(0, params.limit || 10)
      .map(ticker => this.normalizeToAsset(ticker));
  }

  async getTopLosers(params: AssetQueryParams): Promise<Asset[]> {
    // ✅ 전체 티커 데이터 조회 후 하락률 정렬
    const tickers = await this.getTickersData();

    return tickers
      .sort((a, b) => a.signed_change_rate - b.signed_change_rate)
      .slice(0, params.limit || 10)
      .map(ticker => this.normalizeToAsset(ticker));
  }

  async getSnapshots(params: AssetQueryParams): Promise<Asset[]> {
    const markets = params.symbols?.map(symbol => `KRW-${symbol}`).join(',') || 'KRW-BTC';
    const tickers: UpbitTicker[] = await this.httpService.get<UpbitTicker[]>(
      `${this.baseUrl}/ticker?markets=${markets}`,
    );
    return tickers.map(ticker => this.normalizeToAsset(ticker));
  }

  private normalizeToAsset(data: UpbitMarket | UpbitTicker): Asset {
    if ('market' in data && 'korean_name' in data) {
      return {
        symbol: data.market.replace('KRW-', ''),
        name: data.korean_name,
        assetType: AssetType.CRYPTO,
        currency: 'KRW',
      };
    } else {
      return {
        symbol: data.market.replace('KRW-', ''),
        name: data.market.replace('KRW-', ''),
        price: data.trade_price,
        change: data.signed_change_price,
        changePercentage: data.signed_change_rate,
        volume: data.acc_trade_volume_24h,
        currency: 'KRW',
        assetType: AssetType.CRYPTO,
      };
    }
  }
}
