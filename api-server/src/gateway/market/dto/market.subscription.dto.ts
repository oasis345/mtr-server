import { AssetType } from '@/financial/types';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsIn,
  IsNotEmptyObject,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

// 1. 채널(Channel)은 '무엇을' 구독할지에 대한 명확한 '계약'입니다.
// '자산(asset)'과 관련된 개념을 제거하여 더 순수하게 목적만 남깁니다.
export enum MarketChannel {
  // 'Top 100'과 같은 방송(Broadcast)형 구독
  MARKET_CAP = 'marketCap',
  // 개별 종목(Symbol) 구독
  SYMBOL = 'symbol',
}

// 2. MarketPayload는 구독 요청에 필요한 모든 정보를 담습니다.
export class MarketPayload {
  // `marketCap` 인지, `symbol` 구독인지 명시합니다.
  @IsEnum(MarketChannel)
  channel: MarketChannel;

  // 구독 대상이 `stock` 인지 `crypto` 인지 명시합니다. (기존 asset -> assetType으로 명칭 통일)
  @IsEnum(AssetType)
  assetType: AssetType;

  // 3. channel이 'SYMBOL'일 때만 symbols 필드가 유효하고, 필수값이 되도록 설정합니다.
  @ValidateIf(o => o.channel === MarketChannel.SYMBOL)
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  symbols?: string[];
}

// 4. 최종적으로 클라이언트가 보내는 전체 요청의 구조입니다.
export class MarketSubscription {
  @IsIn(['subscribe', 'unsubscribe'])
  action: 'subscribe' | 'unsubscribe';

  // payload 객체 자체와 그 내부 필드들의 유효성 검사를 모두 수행합니다.
  @ValidateNested()
  @IsNotEmptyObject()
  @Type(() => MarketPayload) // payload가 MarketPayload 클래스로 변환되어 유효성 검사가 동작하도록 합니다.
  payload: MarketPayload;
}
