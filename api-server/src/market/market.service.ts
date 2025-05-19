export type Exchange = 'upbit' | 'binance' | 'bithumb';

export interface TickerData {
  exchange: Exchange;
  baseToken: string;
  quoteToken: string;
  price: number;
  volume: number;
  change24h: number;
  timestamp: number;
}

export abstract class BaseMarketService {
  protected createTickerKey(
    exchange: Exchange,
    baseToken: string,
    quoteToken: string,
  ): string {
    return `ticker-${exchange}-${baseToken}-${quoteToken}`;
  }
}
