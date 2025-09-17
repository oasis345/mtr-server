import { CustomHttpModule } from '@/common/http/http.module';
import { AssetType } from '@/common/types/asset.types';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CryptoService } from './assets/crypto/crypto.service';
import { StockService } from './assets/stock/stock.service';
import { FinancialController } from './financial.controller';
import { FinancialService } from './financial.service';
import { AlpacaClient } from './providers/alpaca/alpaca.client';
import { AlpacaStockProvider } from './providers/alpaca/alpaca.stock.provider';
import { FINANCIAL_PROVIDER, FinancialProvider } from './providers/financial.provider';
import { FmpClient } from './providers/fmp/fmp.client';
import { FmpStockProvider } from './providers/fmp/fmp.stock.provider';
import { UpbitCryptoProvider } from './providers/upbit/upbit.crypto.provider';
import { YahooStockProvider } from './providers/yahoo/yahoo.stock.provider';

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
    FmpStockProvider,
    YahooStockProvider,
    AlpacaStockProvider,
    UpbitCryptoProvider,

    // 3. (핵심) GatewayModule과 동일한 동적 팩토리 패턴을 적용합니다.
    {
      provide: FINANCIAL_PROVIDER,
      // 4. useFactory는 inject에 명시된 Provider들의 '인스턴스'를 배열로 주입받습니다.
      useFactory: (...providers: FinancialProvider[]) => {
        // 참고: 현재 모든 Provider의 assetType이 'STOCK'으로 동일하므로,
        // Map을 사용하면 마지막 Provider(AlpacaStockProvider)만 남게 됩니다.
        // 향후 crypto 등이 추가될 때를 대비한 구조입니다.
        return new Map<AssetType, FinancialProvider>(providers.map(provider => [provider.assetType, provider]));
      },
      // 5. 이 팩토리에 주입할 Provider 클래스들만 명시합니다.
      inject: [FmpStockProvider, YahooStockProvider, AlpacaStockProvider, UpbitCryptoProvider],
    },
  ],
  exports: [FinancialService],
})
export class FinancialModule {}
