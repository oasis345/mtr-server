import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { AuthModule } from '@/auth/auth.module';
import { CacheTTL } from '@/common/constants/cache.constants';
import { HttpExceptionFilter } from '@/common/filters/http-exception.filter';
import { UserModule } from '@/user/user.module';
import KeyvRedis from '@keyv/redis';
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from 'database/prisma.module';
import Keyv from 'keyv';
import { FinancialModule } from './financial/financial.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('REDIS_HOST');
        const port = configService.get<number>('REDIS_PORT');
        const username = configService.get<string>('REDIS_USERNAME');
        const password = configService.get<string>('REDIS_PASSWORD');

        if (!host || !port || !password) {
          throw new Error('Redis connection information is missing');
        }

        console.log('🔧 Setting up Redis cache (Keyv + @keyv/redis)...');

        const redisUrl = `redis://${username}:${password}@${host}:${port}/0`;

        return {
          store: new Keyv({
            store: new KeyvRedis(redisUrl),
            ttl: CacheTTL.ONE_HOUR,
          }),
        };
      },
      inject: [ConfigService],
      isGlobal: true,
    }),
    PrismaModule,
    UserModule,
    AuthModule,
    FinancialModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    AppService,
  ],
})
export class AppModule {}
