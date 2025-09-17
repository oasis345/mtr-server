import { STREAM_PROVIDER_MAP } from '@/common/types';
import { AssetType } from '@/common/types/asset.types';
import { Module } from '@nestjs/common';
import { MarketGateway } from './market.gateway';
import { MarketSubscriptionService } from './market.subsciption.service';
import { AlpacaStockStreamProvider } from './providers/alpaca/alpaca.stock.provider';
import { MarketStreamProvider } from './types/provider.interface';

@Module({
  providers: [
    MarketGateway,
    MarketSubscriptionService,
    AlpacaStockStreamProvider,
    // TODO: UpbitCryptoStreamProvider가 생기면 여기에 추가

    {
      provide: STREAM_PROVIDER_MAP,
      useFactory: (...providers: MarketStreamProvider[]) => {
        const map = new Map<AssetType, MarketStreamProvider>();
        providers.forEach(provider => {
          map.set(provider.assetType, provider);
        });
        return map;
      },
      // 주입받을 Provider 클래스들을 명시합니다.
      inject: [AlpacaStockStreamProvider /*, UpbitCryptoStreamProvider */],
    },
  ],
  exports: [MarketGateway],
})
export class MarketModule {}
