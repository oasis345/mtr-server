import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ChannelScope } from './subscription';

/**
 * 구독 가능한 공용 채널의 종류를 정의합니다.
 */
export enum PublicChannel {
  STOCK_MARKET_CAP = 'stock:marketCap',
  CRYPTO_MARKET_CAP = 'crypto:marketCap',
  STOCK_SYMBOL = 'stock:symbol',
  CRYPTO_SYMBOL = 'crypto:symbol',
}

/**
 * PUBLIC 스코프의 페이로드 계약
 */
class PublicPayload {
  @IsEnum(PublicChannel)
  channel: PublicChannel;

  /**
   * type이 'stock:symbol' 또는 'crypto:symbol'일 때 사용됩니다.
   */
  @ValidateIf(o => o.channel === PublicChannel.STOCK_SYMBOL || o.channel === PublicChannel.CRYPTO_SYMBOL)
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  symbols?: string[];
}

export class MarketSubscription {
  @IsIn(['subscribe', 'unsubscribe'])
  action: 'subscribe' | 'unsubscribe';

  @IsEnum(ChannelScope)
  scope: ChannelScope;

  @ValidateIf(o => o.scope === ChannelScope.PUBLIC)
  @ValidateNested()
  @Type(() => PublicPayload)
  payload?: PublicPayload;

  /**
   * @deprecated 향후 유료 플랜 등을 위해 예약된 필드입니다.
   * 현재 사용되지 않으며, 구현 시 별도의 PrivatePayload 클래스를 정의해야 합니다.
   */
  @IsOptional()
  private?: any;
}
