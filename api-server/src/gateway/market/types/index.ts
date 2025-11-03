import { Asset, Candle, Trade } from '@/common/types';

export * from './alpaca.stream.types';
export * from './provider.interface';
export * from './upbit.stream.types';

export enum MarketChannel {
  // 기존 채널 구독
  MOST_ACTIVE = 'mostActive',
  GAINERS = 'gainers',
  LOSERS = 'losers',
  TOP_TRADED = 'topTraded',

  // 개별 종목 구독 (사용자별)
  USER_SYMBOLS = 'userSymbols',

  // 개인 종목 클릭 (종목별)
  SYMBOL = 'symbol',
}

export enum ChannelDataType {
  TICKER = 'ticker',
  TRADE = 'trade',
  CANDLE = 'candle',
}

export interface MarketStreamData {
  dataType?: ChannelDataType;
  payload: Asset | Candle | Trade;
}
