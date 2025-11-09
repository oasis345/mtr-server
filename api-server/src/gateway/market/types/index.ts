import { Asset, Candle, Trade } from '@/common/types';
import WebSocket from 'ws';

export * from './alpaca.stream.types';
export * from './provider.interface';
export * from './upbit.stream.types';
export * from './kis.stream.types';

export enum MarketChannel {
  // 기존 채널 구독
  MOST_ACTIVE = 'mostActive',
  GAINERS = 'gainers',
  LOSERS = 'losers',
  TOP_TRADED = 'topTraded',

  SYMBOLS = 'symbols',
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

export const isOpenedSocket = (socket: WebSocket): socket is WebSocket => {
  return socket?.readyState === WebSocket.OPEN;
};
