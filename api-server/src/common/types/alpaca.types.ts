export interface AlpacaMostActiveItem {
  symbol: string;
  price: number;
  volume: number; // 🎯 거래량 필드
}

export interface AlpacaMostActiveResponse {
  most_actives: AlpacaMostActiveItem[];
}

export interface AlpacaMover {
  change: number;
  percent_change: number;
  price: number;
  symbol: string;
}

export interface AlpacaMoversResponse {
  gainers: AlpacaMover[];
  losers: AlpacaMover[];
}

export interface AlpacaQuote {
  ap: number; // Ask Price //가격 호가
  as: number; // Ask Size //호가 건수
  ax: string; // Ask Exchange //호가 거래소
  bp: number; // Bid Price //가격 호가
  bs: number; // Bid Size //호가 건수
  bx: string; // Bid Exchange //호가 거래소
  c: string[]; // Conditions //조건
  t: string; // Timestamp //시간
  z: string; // Tape //테이프
}

export interface AlpacaLatestQuotesResponse {
  quotes: Record<string, AlpacaQuote>;
}

export interface AlpacaAsset {
  id: string;
  class: string;
  exchange: string;
  symbol: string;
  name: string;
  status: string;
  tradable: boolean;
  marginable: boolean;
  maintenance_margin_requirement: number;
  margin_requirement_long: string;
  margin_requirement_short: string;
  shortable: boolean;
  easy_to_borrow: boolean;
  fractionable: boolean;
  attributes: string[];
}

export interface AlpacaSnapshotsResponse {
  [symbol: string]: AlpacaSnapshot;
}

export interface AlpacaSnapshot {
  dailyBar: AlpacaBar;
  latestQuote: AlpacaQuote;
  latestTrade: AlpacaTrade;
  minuteBar: AlpacaBar;
  prevDailyBar: AlpacaBar;
}

// 바 데이터 (일봉, 분봉 등)
export interface AlpacaBar {
  c: number; // Close price
  h: number; // High price
  l: number; // Low price
  n: number; // Number of trades
  o: number; // Open price
  t: string; // Timestamp
  v: number; // Volume
  vw: number; // Volume weighted average price
}

// 호가 데이터
export interface AlpacaQuote {
  ap: number; // Ask price
  as: number; // Ask size
  ax: string; // Ask exchange
  bp: number; // Bid price
  bs: number; // Bid size
  bx: string; // Bid exchange
  c: string[]; // Conditions
  t: string; // Timestamp
  z: string; // Tape
}

// 거래 데이터
export interface AlpacaTrade {
  c: string[]; // Conditions
  i: number; // Trade ID
  p: number; // Price
  s: number; // Size (Volume)
  t: string; // Timestamp
  x: string; // Exchange
  z: string; // Tape
}

// Alpaca API가 반환하는 raw trade 데이터의 타입 (필요한 것만 정의)
export interface AlpacaRawTrade {
  Symbol: string;
  Price: number;
  Size: number;
  Timestamp: string;
}

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
