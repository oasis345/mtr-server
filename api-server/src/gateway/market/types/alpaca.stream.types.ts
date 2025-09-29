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
