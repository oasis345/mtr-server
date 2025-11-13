import { AssetType } from '@/common/types/asset.types';
import { Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsNotEmptyObject,
  IsOptional,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ChannelDataType, MarketChannel } from '../types';
import { ChartTimeframe } from '@/common/types';

// 2. MarketPayload는 구독 요청에 필요한 모든 정보를 담습니다.
export class MarketPayload {
  // 구독 채널
  @IsEnum(MarketChannel)
  channel: MarketChannel;

  // 구독 대상이 `stock` 인지 `crypto` 인지 명시합니다. (기존 asset -> assetType으로 명칭 통일)
  @IsEnum(AssetType)
  assetType: AssetType;

  @IsArray()
  @IsEnum(ChannelDataType, { each: true })
  @ArrayNotEmpty()
  @IsOptional()
  dataTypes?: ChannelDataType[];

  // 거래소가 있는 경우 CompositeKey로 get. ex NASDAQ:AAPL, UPBIT:KRW-BTC
  @ValidateIf(o => o.channel === MarketChannel.SYMBOLS)
  @Transform(({ value }) => value?.map(val => val.toUpperCase()))
  @IsArray()
  @ArrayNotEmpty()
  @IsOptional()
  symbols?: string[];

  @ValidateIf(o => o.dataTypes?.includes(ChannelDataType.CANDLE)) // CANDLE 데이터 타입일 때만 유효성 검사
  @IsOptional()
  timeframe?: ChartTimeframe;
}

// 4. 최종적으로 클라이언트가 보내는 전체 요청의 구조입니다.
export class MarketSubscription {
  // payload 객체 자체와 그 내부 필드들의 유효성 검사를 모두 수행합니다.
  @ValidateNested()
  @IsNotEmptyObject()
  @Type(() => MarketPayload) // payload가 MarketPayload 클래스로 변환되어 유효성 검사가 동작하도록 합니다.
  payload: MarketPayload;
}
