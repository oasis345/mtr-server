import { FinancialProvider } from '@/financial/providers/financial.provider';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MarketGateway } from './base.gateway';
import { SUBSCRIPTION_PROVIDERS } from './types/common';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'STOCK_SUBSCRIPTION_PROVIDER',
      useFactory: (configService: ConfigService) => {
        const providerKey =
          configService.get<SUBSCRIPTION_PROVIDERS.STOCK_SUBSCRIPTION_PROVIDER>('STOCK_SUBSCRIPTION_PROVIDER');
        const providerMap = new Map<SUBSCRIPTION_PROVIDERS, FinancialProvider>([
          [SUBSCRIPTION_PROVIDERS.STOCK_SUBSCRIPTION_PROVIDER, fmpService],
          [SUBSCRIPTION_PROVIDERS.CRYPTO_SUBSCRIPTION_PROVIDER, yahooService],
        ]);

        const selectedProvider = providerMap.get(providerKey);

        if (!selectedProvider) {
          throw new Error(`Financial provider "${providerKey}" is not supported.`);
        }

        return selectedProvider;
      },
      inject: [ConfigService],
    },
  ],
  exports: [MarketGateway],
})
export class GatewayModule {}
