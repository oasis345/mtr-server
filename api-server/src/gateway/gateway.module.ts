import { Global, Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '@/redis/redis.service';
import { MarketGateway } from './market.gateway';
import { ConfigModule } from '@nestjs/config';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [MarketGateway, JwtService, RedisService],
  exports: [MarketGateway],
})
export class GatewayModule {}
