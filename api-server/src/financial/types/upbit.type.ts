// GET /v1/ticker
// 현재가 정보 목록
export interface UpbitTicker {
  market: string;
  trade_date: string;
  trade_time: string;
  trade_date_kst: string;
  trade_time_kst: string;
  trade_timestamp: number;
  opening_price: number;
  high_price: number;
  low_price: number;
  trade_price: number;
  prev_closing_price: number;
  change: string;
  change_price: number;
  change_rate: number;
  signed_change_price: number;
  signed_change_rate: number;
  trade_volume: number;
  acc_trade_price: number;
  acc_trade_price_24h: number;
  acc_trade_volume: number;
  acc_trade_volume_24h: number;
  highest_52_week_price: number;
  highest_52_week_date: string;
  lowest_52_week_price: number;
  lowest_52_week_date: string;
  timestamp: number;
}

// GET /v1/orderbook
// 현재 호가 정보
export interface UpbitOrderbook {
  market: string;
  timestamp: number;
  total_ask_size: number;
  total_bid_size: number;
  orderbook_units: Array<{
    ask_price: number;
    bid_price: number;
    ask_size: number;
    bid_size: number;
  }>;
}

// GET /v1/trades/ticks
// 최근 체결 내역 목록
export interface UpbitTrade {
  market: string;
  trade_date_utc: string;
  trade_time_utc: string;
  timestamp: number;
  trade_timestamp: number;
  trade_price: number;
  trade_volume: number;
  prev_closing_price: number;
  change_price: number;
  ask_bid: string; // "ASK" | "BID"
  sequential_id: number;
}

// GET /v1/candles/minutes/{unit}
// GET /v1/candles/days
// GET /v1/candles/weeks
// GET /v1/candles/months
export interface UpbitCandle {
  market: string;
  opening_price: number;
  high_price: number;
  low_price: number;
  trade_price: number;
  timestamp: number;
  candle_acc_trade_price: number;
  candle_acc_trade_volume: number;
  candle_date_time_kst: string;
  candle_date_time_utc: string;
  first_day_of_period: string;
  change_price: number;
  change_rate: number;
  prev_closing_price: number;
}

// GET /v1/market/all
// 모든 거래 가능한 마켓 목록 조회
export interface UpbitMarket {
  market: string; // "KRW-BTC"
  korean_name: string; // "비트코인"
  english_name: string; // "Bitcoin"
  market_warning: string; // "NONE" | "CAUTION"
}
