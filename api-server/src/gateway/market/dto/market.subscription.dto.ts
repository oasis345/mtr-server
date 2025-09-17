import { AssetType } from '@/common/types/asset.types';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsNotEmptyObject,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

// 1. 채널(Channel)은 '무엇을' 구독할지에 대한 명확한 '계약'입니다.
// '자산(asset)'과 관련된 개념을 제거하여 더 순수하게 목적만 남깁니다.
export enum MarketChannel {
  // 기존 채널 구독
  MOST_ACTIVE = 'mostActive',
  GAINERS = 'gainers',
  LOSERS = 'losers',

  // 개별 종목 구독 (사용자별)
  USER_SYMBOLS = 'userSymbols',

  // 개인 종목 클릭 (종목별)
  SYMBOL = 'symbol',
}

// 2. MarketPayload는 구독 요청에 필요한 모든 정보를 담습니다.
export class MarketPayload {
  // 구독 채널
  @IsEnum(MarketChannel)
  channel: MarketChannel;

  // 구독 대상이 `stock` 인지 `crypto` 인지 명시합니다. (기존 asset -> assetType으로 명칭 통일)
  @IsEnum(AssetType)
  assetType: AssetType;

  // USER_SYMBOLS일 때: 사용자가 구독할 종목들
  @ValidateIf(o => o.channel === MarketChannel.USER_SYMBOLS)
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  userSymbols?: string[];

  // SYMBOL일 때: 클릭한 단일 종목
  @ValidateIf(o => o.channel === MarketChannel.SYMBOL)
  @IsString()
  symbol?: string;
}

// 4. 최종적으로 클라이언트가 보내는 전체 요청의 구조입니다.
export class MarketSubscription {
  // payload 객체 자체와 그 내부 필드들의 유효성 검사를 모두 수행합니다.
  @ValidateNested()
  @IsNotEmptyObject()
  @Type(() => MarketPayload) // payload가 MarketPayload 클래스로 변환되어 유효성 검사가 동작하도록 합니다.
  payload: MarketPayload;
}
