import { AssetType, STREAM_PROVIDER_MAP } from '@/common/types';
import { Module } from '@nestjs/common';
import { MarketGateway } from './market.gateway';
import { MarketSubscriptionService } from './market.subsciption.service';
import { AlpacaStockStreamProvider } from './providers/alpaca/alpaca.stock.provider';
import { UpbitCryptoStreamProvider } from './providers/upbit/upbit.crypto.provider';
import type { MarketStreamProvider } from './types';

@Module({
  providers: [
    MarketGateway,
    MarketSubscriptionService,
    AlpacaStockStreamProvider,
    UpbitCryptoStreamProvider,
    {
      provide: STREAM_PROVIDER_MAP,
      useFactory: (...providers: MarketStreamProvider[]) => {
        const map = new Map<AssetType, MarketStreamProvider>();
        providers.forEach(p => map.set(p.assetType, p));
        return map;
      },
      // 주입받을 Provider 클래스들을 명시합니다.
      inject: [AlpacaStockStreamProvider, UpbitCryptoStreamProvider],
    },
  ],
  exports: [MarketGateway],
})
export class MarketModule {}
