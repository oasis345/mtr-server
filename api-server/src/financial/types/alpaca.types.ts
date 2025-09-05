export interface AlpacaMostActiveResponse {
  most_actives: {
    symbol: string;
    trade_count: number;
    volume: number;
  }[];
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
  ap: number; // Ask Price
  as: number; // Ask Size
  ax: string; // Ask Exchange
  bp: number; // Bid Price
  bs: number; // Bid Size
  bx: string; // Bid Exchange
  c: string[]; // Conditions
  t: string; // Timestamp
  z: string; // Tape
}

export interface AlpacaLatestQuotesResponse {
  quotes: Record<string, AlpacaQuote>;
}
