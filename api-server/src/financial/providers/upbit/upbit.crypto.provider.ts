import { CustomHttpService } from '@/common/http/http.service';
import { AssetType, Candle, Trade } from '@/common/types';
import { getErrorMessage } from '@/common/utils/error';
import { Injectable, Logger } from '@nestjs/common';
import {
  AssetQueryParams,
  CandleQueryParams,
  CandleResponse,
  Crypto,
  UpbitCandle,
  UpbitMarket,
  UpbitTicker,
  UpbitTrade,
} from '../../types';
import { BaseFinancialProvider } from '../financial.provider';

@Injectable()
export class UpbitCryptoProvider extends BaseFinancialProvider {
  assetType = AssetType.CRYPTO;
  private readonly baseUrl = 'https://api.upbit.com/v1';
  private readonly logger = new Logger(UpbitCryptoProvider.name);

  constructor(private readonly httpService: CustomHttpService) {
    super();
  }

  async getAssets(): Promise<Crypto[]> {
    const markets: UpbitMarket[] = await this.httpService.get<UpbitMarket[]>(`${this.baseUrl}/market/all`);
    return markets
      .filter(market => market.market.startsWith('KRW-'))
      .map(market => {
        return {
          symbol: market.market.replace('KRW-', ''),
          name: market.english_name,
          assetType: AssetType.CRYPTO,
        };
      });
  }

  async getTopTraded(params: AssetQueryParams): Promise<Crypto[]> {
    const tickers = await this.getTickersData();
    return tickers
      .sort((a, b) => b.acc_trade_price_24h - a.acc_trade_price_24h)
      .slice(0, params.limit)
      .map(ticker => this.normalizeToCrypto(ticker));
  }

  async getMostActive(params: AssetQueryParams): Promise<Crypto[]> {
    // ✅ 전체 티커 데이터 조회 후 거래량 정렬
    const tickers = await this.getTickersData();

    return tickers
      .sort((a, b) => b.acc_trade_volume_24h - a.acc_trade_volume_24h)
      .slice(0, params.limit)
      .map(ticker => this.normalizeToCrypto(ticker));
  }

  async getTopGainers(params: AssetQueryParams): Promise<Crypto[]> {
    // ✅ 전체 티커 데이터 조회 후 상승률 정렬
    const tickers = await this.getTickersData();

    return tickers
      .sort((a, b) => b.signed_change_rate - a.signed_change_rate)
      .slice(0, params.limit)
      .map(ticker => this.normalizeToCrypto(ticker));
  }

  async getTopLosers(params: AssetQueryParams): Promise<Crypto[]> {
    // ✅ 전체 티커 데이터 조회 후 하락률 정렬
    const tickers = await this.getTickersData();

    return tickers
      .sort((a, b) => a.signed_change_rate - b.signed_change_rate)
      .slice(0, params.limit)
      .map(ticker => this.normalizeToCrypto(ticker));
  }

  async getSnapshots(params: AssetQueryParams): Promise<Crypto[]> {
    const markets = params.symbols?.map(symbol => `KRW-${symbol}`).join(',') || 'KRW-BTC';
    const tickers: UpbitTicker[] = await this.httpService.get<UpbitTicker[]>(
      `${this.baseUrl}/ticker?markets=${markets}`,
    );
    return tickers.map(ticker => this.normalizeToCrypto(ticker));
  }

  async getCandles(params: CandleQueryParams): Promise<CandleResponse> {
    try {
      const { symbols, timeframe, start } = params;
      const limit = 199; // Upbit API 제한으로 인해 최대 200개까지만 가능 + 무한 스크롤 구현을 위해 199로 설정

      if (symbols.length === 0) throw new Error('symbols are required');
      if (!timeframe) throw new Error('timeframe is required');
      if (symbols.length > 1) throw new Error('Crypto is only one symbol is supported');

      const [symbol] = symbols;
      const { end } = this.getDefaultTimeRange(timeframe);
      const endpointMap = new Map<string, (tf: string) => string>([
        ['T', tf => `${this.baseUrl}/candles/minutes/${parseInt(tf, 10)}`], // 예: "5m" → minutes/5
        [
          'H',
          tf => {
            const hours = parseInt(tf, 10);
            if (Number.isNaN(hours) || hours < 1) throw new Error(`Unsupported timeframe: ${tf}`);
            const minutes = hours * 60;
            const allowed = minutes <= 60 ? 60 : 240;
            return `${this.baseUrl}/candles/minutes/${allowed}`;
          },
        ],
        ['D', () => `${this.baseUrl}/candles/days`],
        ['W', () => `${this.baseUrl}/candles/weeks`],
        ['M', () => `${this.baseUrl}/candles/months`],
        ['Y', () => `${this.baseUrl}/candles/years`],
      ]);

      const unit = timeframe?.[timeframe.length - 1];
      const resolver = unit ? endpointMap.get(unit) : undefined;
      if (!resolver) throw new Error(`Unsupported timeframe: ${timeframe}`);

      const apiUrl = resolver(timeframe);
      const candles = await this.httpService.get<UpbitCandle[]>(apiUrl, {
        params: { market: `KRW-${symbol}`, to: start ?? end, count: limit + 1 }, // 무한 스크롤 구현을 위해 count를 limit + 1로 설정
      });
      const normalizedCandles = candles.map(candle => this.normalizeToCandle(candle));
      let nextDateTime: string | null = null;
      if (normalizedCandles.length > limit) {
        // limit+1개가 왔으면 마지막 캔들의 시간을 nextDateTime으로 사용
        const lastCandle = normalizedCandles[normalizedCandles.length - 1];
        nextDateTime = lastCandle.timestamp;

        // 실제 반환할 데이터는 limit개만 (마지막 하나 제외)
        normalizedCandles.splice(-1, 1);
      }
      return {
        candles: normalizedCandles,
        nextDateTime,
      };
    } catch (error) {
      this.logger.error(`Failed to get candles for Crypto Candles`, getErrorMessage(error));
      return { candles: [], nextDateTime: null };
    }
  }

  async getTrades(params: AssetQueryParams): Promise<Trade[]> {
    const { symbols } = params;
    const [symbol] = symbols;
    const response = await this.httpService.get<UpbitTrade[]>(`${this.baseUrl}/trades/ticks`, {
      params: {
        market: `KRW-${symbol}`,
        count: 50,
      },
    });

    const trades: Trade[] = response.map(trade => {
      const changePercentage = trade.prev_closing_price
        ? (trade.trade_price - trade.prev_closing_price) / trade.prev_closing_price
        : 0; // 또는 null, 적절한 기본값

      return {
        id: trade.sequential_id.toString(),
        timestamp: new Date(trade.timestamp).toISOString(),
        price: trade.trade_price,
        volume: trade.trade_volume,
        change: trade.change_price,
        changePercentage,
        symbol: trade.market.replace('KRW-', ''),
        assetType: AssetType.CRYPTO,
        currency: 'KRW',
        side: trade.ask_bid === 'ASK' ? 'sell' : 'buy',
      };
    });

    return trades;
  }

  // ✅ 공통 티커 데이터 조회 메서드
  private async getTickersData(): Promise<UpbitTicker[]> {
    const markets: UpbitMarket[] = await this.httpService.get<UpbitMarket[]>(`${this.baseUrl}/market/all`);
    const marketSymbols = markets.map(market => market.market).join(',');
    const tickersData = await this.httpService.get<UpbitTicker[]>(`${this.baseUrl}/ticker?markets=${marketSymbols}`);

    return tickersData;
  }

  private normalizeToCrypto(data: UpbitTicker): Crypto {
    return {
      symbol: data.market.replace('KRW-', ''),
      price: data.trade_price,
      change: data.change_price,
      changePercentage: data.signed_change_rate,
      volume: data.acc_trade_volume_24h,
      currency: 'KRW',
      assetType: AssetType.CRYPTO,
    };
  }

  private normalizeToCandle(data: UpbitCandle): Candle {
    return {
      symbol: data.market.replace('KRW-', ''),
      open: data.opening_price,
      high: data.high_price,
      low: data.low_price,
      close: data.trade_price,
      timestamp: data.candle_date_time_utc,
      volume: data.candle_acc_trade_volume,
      tradeCount: data.candle_acc_trade_price,
      change: data.change_price,
      changePercentage: data.change_rate,
      assetType: AssetType.CRYPTO,
      currency: 'KRW',
    };
  }
}
