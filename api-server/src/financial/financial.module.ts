import { CustomHttpModule } from '@/common/http/http.module';
import { AssetType } from '@/common/types/asset.types';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Cache } from 'cache-manager';
import { CryptoService } from './assets/crypto/crypto.service';
import { StockService } from './assets/stock/stock.service';
import { FinancialController } from './financial.controller';
import { FinancialService } from './financial.service';
import { AlpacaClient } from './providers/alpaca/alpaca.client';
import { AlpacaStockProvider } from './providers/alpaca/alpaca.stock.provider';
import { FINANCIAL_PROVIDER, FinancialProvider } from './providers/financial.provider';
import { FmpClient } from './providers/fmp/fmp.client';
import { UpbitCryptoProvider } from './providers/upbit/upbit.crypto.provider';
import { AssetServiceConfig } from './types';
import { CRYPTO_ASSET_CONFIG, STOCK_ASSET_CONFIG } from './types/common.types';

@Module({
  imports: [CustomHttpModule, ConfigModule],
  controllers: [FinancialController],
  providers: [
    // 1. 핵심 서비스 및 클라이언트들을 먼저 등록합니다.
    FinancialService,
    StockService,
    CryptoService,
    FmpClient,
    AlpacaClient, // [수정] 의존성 주입을 위해 Client들을 등록해야 합니다.

    // 2. FinancialProvider 인터페이스를 구현하는 모든 Provider들을 등록합니다.
    AlpacaStockProvider,
    UpbitCryptoProvider,
    // Map<AssetType, FinancialProvider> ← 인스턴스로 생성
    {
      provide: FINANCIAL_PROVIDER,
      useFactory: (alpaca: AlpacaStockProvider, upbit: UpbitCryptoProvider): Map<AssetType, FinancialProvider> => {
        return new Map<AssetType, FinancialProvider>([
          [alpaca.assetType, alpaca],
          [upbit.assetType, upbit],
        ]);
      },
      inject: [AlpacaStockProvider, UpbitCryptoProvider],
    },
    {
      provide: STOCK_ASSET_CONFIG.name,
      useFactory: (): AssetServiceConfig => STOCK_ASSET_CONFIG,
    },
    {
      provide: CRYPTO_ASSET_CONFIG.name,
      useFactory: (): AssetServiceConfig => CRYPTO_ASSET_CONFIG,
    },

    // 서비스 바인딩: 각 서비스에 자신 전용 설정을 주입
    {
      provide: StockService,
      useFactory: (providerMap: Map<AssetType, FinancialProvider>, cache: Cache, cfg: AssetServiceConfig) =>
        new StockService(providerMap, cache, cfg),
      inject: [FINANCIAL_PROVIDER, CACHE_MANAGER, STOCK_ASSET_CONFIG.name],
    },
    {
      provide: CryptoService,
      useFactory: (providerMap: Map<AssetType, FinancialProvider>, cache: Cache, cfg: AssetServiceConfig) =>
        new CryptoService(providerMap, cache, cfg),
      inject: [FINANCIAL_PROVIDER, CACHE_MANAGER, CRYPTO_ASSET_CONFIG.name],
    },
  ],
  exports: [FinancialService],
})
export class FinancialModule {}
