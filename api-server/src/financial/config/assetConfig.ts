import { CacheTTL } from '@/common/constants/cache.constants';
import { AssetType } from '@/common/types';
import { CronExpression } from '@nestjs/schedule';
import { getCandleTTL, getSymbolTTL } from '../cache/marketTTL';
import { CacheConfig, DataTypeMethodMap, MarketDataType } from '../types';

export const ASSET_CONFIGS = 'ASSET_CONFIGS';

export interface AssetServiceConfig {
  name: string;
  assetType: AssetType;
  dataTypeMethodMap: DataTypeMethodMap;
  cacheableDataTypeMap: Map<MarketDataType, CacheConfig>;
  defaultLimits: Map<MarketDataType, number>;
}

export const CRYPTO_ASSET_CONFIG: AssetServiceConfig = {
  name: 'CRYPTO_ASSET_CONFIG',
  assetType: AssetType.CRYPTO,
  dataTypeMethodMap: new Map([
    [MarketDataType.ASSETS, 'getAssets'],
    [MarketDataType.TOP_TRADED, 'getTopTraded'],
    [MarketDataType.SYMBOL, 'getSnapshots'],
    [MarketDataType.CANDLES, 'getCandles'],
    [MarketDataType.TRADES, 'getTrades'],
  ]),
  cacheableDataTypeMap: new Map<MarketDataType, CacheConfig>([
    [MarketDataType.ASSETS, { ttl: CacheTTL.EVERY_12_HOURS, refreshInterval: CronExpression.EVERY_12_HOURS }],
    [MarketDataType.TOP_TRADED, { ttl: CacheTTL.ONE_MINUTE, refreshInterval: CronExpression.EVERY_MINUTE }],
    [MarketDataType.SYMBOL, { ttl: () => getSymbolTTL(), withLogo: false, warmup: false }],
    [MarketDataType.CANDLES, { ttl: p => getCandleTTL(p.timeframe), warmup: false }],
    [MarketDataType.TRADES, { ttl: CacheTTL.FIVE_SECONDS, warmup: false }],
  ]),
  defaultLimits: new Map<MarketDataType, number>([
    [MarketDataType.TOP_TRADED, 200],
    [MarketDataType.CANDLES, 200],
    [MarketDataType.TRADES, 50],
  ]),
};

export const STOCK_ASSET_CONFIG: AssetServiceConfig = {
  name: 'STOCK_ASSET_CONFIG',
  assetType: AssetType.STOCK,
  dataTypeMethodMap: new Map([
    [MarketDataType.ASSETS, 'getAssets'],
    [MarketDataType.MOST_ACTIVE, 'getMostActive'],
    [MarketDataType.GAINERS, 'getTopGainers'],
    [MarketDataType.LOSERS, 'getTopLosers'],
    [MarketDataType.SYMBOL, 'getSnapshots'],
    [MarketDataType.CANDLES, 'getCandles'],
    [MarketDataType.TRADES, 'getTrades'],
  ]),
  cacheableDataTypeMap: new Map<MarketDataType, CacheConfig>([
    [MarketDataType.ASSETS, { ttl: CacheTTL.EVERY_12_HOURS, refreshInterval: CronExpression.EVERY_12_HOURS }],
    [
      MarketDataType.MOST_ACTIVE,
      { ttl: CacheTTL.ONE_MINUTE, refreshInterval: CronExpression.EVERY_MINUTE, withLogo: true },
    ],
    [
      MarketDataType.GAINERS,
      { ttl: CacheTTL.ONE_MINUTE, refreshInterval: CronExpression.EVERY_MINUTE, withLogo: true },
    ],
    [MarketDataType.LOSERS, { ttl: CacheTTL.ONE_MINUTE, refreshInterval: CronExpression.EVERY_MINUTE, withLogo: true }],
    [MarketDataType.CANDLES, { ttl: p => getCandleTTL(p.timeframe), warmup: false }],
    [MarketDataType.SYMBOL, { ttl: () => getSymbolTTL(), withLogo: true, warmup: false }],
    [MarketDataType.TRADES, { ttl: CacheTTL.FIVE_SECONDS, warmup: false }],
  ]),
  defaultLimits: new Map<MarketDataType, number>([
    [MarketDataType.MOST_ACTIVE, 100],
    [MarketDataType.GAINERS, 50],
    [MarketDataType.LOSERS, 50],
    [MarketDataType.TRADES, 50],
  ]),
};
