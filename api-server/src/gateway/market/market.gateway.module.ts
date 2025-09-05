import { AssetType } from '@/financial/types';
import { Module } from '@nestjs/common';
import { MarketGateway } from './market.gateway';
import { MarketSubscriptionService } from './market.subsciption.service';
import { AlpacaClient } from './providers/alpaca/alpaca.client';
import { AlpacaStockStreamProvider } from './providers/alpaca/alpaca.stock.provider';
import { StreamProvider } from './types/provider.interface';

@Module({
  providers: [
    // 1. 필요한 모든 개별 서비스와 실제 Provider 구현체들을 먼저 등록합니다.
    // 이렇게 해야 NestJS가 이들의 '인스턴스'를 생성하고 관리할 수 있습니다.
    MarketGateway,
    MarketSubscriptionService,
    AlpacaClient,
    AlpacaStockStreamProvider,
    // TODO: UpbitCryptoStreamProvider가 생기면 여기에 추가

    // 2. (핵심) STREAM_PROVIDERS_MAP 토큰에 대한 팩토리를 설정합니다.
    {
      provide: 'STREAM_PROVIDER_MAP',
      // 3. 팩토리는 NestJS가 생성한 실제 Provider '인스턴스'들을 주입받습니다.
      useFactory: (...providers: StreamProvider[]) => {
        // 4. 주입받은 Provider들을 순회하며 AssetType을 키로 하는 Map을 생성하여 반환합니다.
        return new Map<AssetType, StreamProvider>(providers.map(provider => [provider.assetType, provider]));
      },
      // 5. 이 팩토리가 의존하는(주입받을) Provider 클래스들을 명시합니다.
      inject: [AlpacaStockStreamProvider /*, UpbitCryptoStreamProvider */],
    },
  ],
  exports: [MarketGateway],
})
export class MarketModule {} // 파일명은 MarketModule이 더 자연스럽습니다.
