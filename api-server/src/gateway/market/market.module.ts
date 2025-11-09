import { AssetType, STREAM_PROVIDER_MAP } from '@/common/types';
import { Module } from '@nestjs/common';
import { MarketGateway } from './market.gateway';
import { MarketSubscriptionService } from './market.subsciption.service';
import { UpbitCryptoStreamProvider } from './providers/upbit/upbit.crypto.provider';
import type { MarketStreamProvider } from './types';
import { KoreaInvestmentStockStreamProvider } from '@/gateway/market/providers/koreaInvestment/kis.stock.provider';
import { CustomHttpModule } from '@/common/http/http.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [CustomHttpModule, ConfigModule],
  providers: [
    MarketGateway,
    MarketSubscriptionService,
    UpbitCryptoStreamProvider,
    KoreaInvestmentStockStreamProvider,
    {
      provide: STREAM_PROVIDER_MAP,
      useFactory: (...providers: MarketStreamProvider[]) => {
        const map = new Map<AssetType, MarketStreamProvider>();
        providers.forEach(p => map.set(p.assetType, p));
        return map;
      },
      // 주입받을 Provider 클래스들을 명시합니다.
      inject: [UpbitCryptoStreamProvider, KoreaInvestmentStockStreamProvider],
    },
  ],
  exports: [MarketGateway],
})
export class MarketModule {}
