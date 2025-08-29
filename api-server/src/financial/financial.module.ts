import { CustomHttpModule } from '@/common/http/http.module';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StockService } from './assets/stock/stock.service';
import { FinancialController } from './financial.controller';
import { FinancialService } from './financial.service';
import { FinancialProvider } from './providers/financial.provider';
import { FmpClient } from './providers/fmp/fmp.client';
import { FmpStockProvider } from './providers/fmp/fmp.stock.provider';
import { YahooService } from './providers/yahoo/yahoo.service';
import { FINANCIAL_PROVIDERS } from './types';

@Module({
  imports: [
    CustomHttpModule,
    ConfigModule,
    // CacheModule을 비동기로 설정하여 Redis 연결 정보를 .env에서 가져옵니다.
  ],
  controllers: [FinancialController],
  providers: [
    FinancialService,
    FmpClient,
    FmpStockProvider,
    YahooService,
    StockService,
    {
      provide: 'STOCK_PROVIDER',
      useFactory: (configService: ConfigService, fmpService: FmpStockProvider, yahooService: YahooService) => {
        const providerKey = configService.get<FINANCIAL_PROVIDERS>('FINANCIAL_PROVIDER');
        const providerMap = new Map<FINANCIAL_PROVIDERS, FinancialProvider>([
          [FINANCIAL_PROVIDERS.FMP, fmpService],
          [FINANCIAL_PROVIDERS.YAHOO, yahooService],
        ]);

        const selectedProvider = providerMap.get(providerKey);

        if (!selectedProvider) {
          throw new Error(`Financial provider "${providerKey}" is not supported.`);
        }

        return selectedProvider;
      },
      inject: [ConfigService, FmpStockProvider, YahooService],
    },
  ],
  exports: [FinancialService],
})
export class FinancialModule {}
