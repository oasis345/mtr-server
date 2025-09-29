import { AppCacheService } from '@/cache/cache.service';
import { CustomHttpModule } from '@/common/http/http.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AssetCacheOrchestrator } from './assets/asset.cache.orchestrator';
import { CryptoService } from './assets/crypto/crypto.service';
import { StockService } from './assets/stock/stock.service';
import { ASSET_CONFIGS, AssetServiceConfig, CRYPTO_ASSET_CONFIG, STOCK_ASSET_CONFIG } from './config/assetConfig';
import { FinancialController } from './financial.controller';
import { FinancialService } from './financial.service';
import { AlpacaClient } from './providers/alpaca/alpaca.client';
import { AlpacaStockProvider } from './providers/alpaca/alpaca.stock.provider';
import { FINANCIAL_PROVIDERS, FinancialProvider } from './providers/financial.provider';
import { ProviderRegistry } from './providers/provider.registry';
import { UpbitCryptoProvider } from './providers/upbit/upbit.crypto.provider';
import { LogoService } from './services/logo.service';

@Module({
  imports: [CustomHttpModule, ConfigModule],
  controllers: [FinancialController],
  providers: [
    FinancialService,
    AlpacaStockProvider,
    UpbitCryptoProvider,
    LogoService,
    AlpacaClient,
    { provide: STOCK_ASSET_CONFIG.name, useValue: STOCK_ASSET_CONFIG },
    { provide: CRYPTO_ASSET_CONFIG.name, useValue: CRYPTO_ASSET_CONFIG },
    {
      provide: FINANCIAL_PROVIDERS,
      useFactory: (alpaca: AlpacaStockProvider, upbit: UpbitCryptoProvider): FinancialProvider[] => [alpaca, upbit],

      inject: [AlpacaStockProvider, UpbitCryptoProvider],
    },
    {
      provide: ProviderRegistry,
      useClass: ProviderRegistry,
    },
    {
      provide: ASSET_CONFIGS,
      useFactory: (stockCfg: AssetServiceConfig, cryptoCfg: AssetServiceConfig) => [stockCfg, cryptoCfg],
      inject: [STOCK_ASSET_CONFIG.name, CRYPTO_ASSET_CONFIG.name],
    },
    AssetCacheOrchestrator,
    {
      provide: StockService,
      useFactory: (
        registry: ProviderRegistry,
        cache: AppCacheService,
        cfg: AssetServiceConfig,
        logo: LogoService,
        orchestrator: AssetCacheOrchestrator,
      ) => {
        const svc = new StockService(registry, cache, cfg, logo);
        orchestrator.init(svc);
        return svc;
      },
      inject: [ProviderRegistry, AppCacheService, STOCK_ASSET_CONFIG.name, LogoService, AssetCacheOrchestrator],
    },
    {
      provide: CryptoService,
      useFactory: (
        registry: ProviderRegistry,
        cache: AppCacheService,
        cfg: AssetServiceConfig,
        orchestrator: AssetCacheOrchestrator,
      ) => {
        const svc = new CryptoService(registry, cache, cfg);
        orchestrator.init(svc);
        return svc;
      },
      inject: [ProviderRegistry, AppCacheService, CRYPTO_ASSET_CONFIG.name, AssetCacheOrchestrator],
    },
  ],
  exports: [FinancialService, LogoService],
})
export class FinancialModule {}
