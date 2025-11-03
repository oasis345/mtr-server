export interface AlpacaWebSocketStockTradeMessage {
  T: string; // message type, always “t”
  S: string; // symbol
  i: number; // trade ID
  x: string; // exchange code where the trade occurred
  p: number; // trade price
  s: number; // trade size
  c: string[]; // trade condition
  t: string; // RFC-3339 formatted timestamp with nanosecond precision
  z: string; // tape
}

export interface AlpacaWebSocketStockQuoteMessage {
  T: string; // message type, always “q”
  S: string; // symbol
  bx: number; // bid exchange code
  bp: number; // bid price
  bs: number; // bid size
  ax: number; // ask exchange code
  ap: number; // ask price
  as: number; // ask size
  t: string; // RFC-3339 formatted timestamp with nanosecond precision
}

export type AlpacaWebSocketStockMessage = AlpacaWebSocketStockTradeMessage | AlpacaWebSocketStockQuoteMessage;
