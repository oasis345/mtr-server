import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { AuthModule } from '@/auth/auth.module';
import { HttpExceptionFilter } from '@/common/filters/http-exception.filter';
import { UserModule } from '@/user/user.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from 'database/prisma.module';
import AppCacheModule from './cache/cache.module';
import { ApiTransformInterceptor } from './common/interceptors/api.transform.interceptor';
import { FinancialModule } from './financial/financial.module';
import { MarketModule } from './gateway/market/market.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),
    EventEmitterModule.forRoot(),
    AppCacheModule,
    PrismaModule,
    UserModule,
    AuthModule,
    FinancialModule,
    ScheduleModule.forRoot(),
    MarketModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ApiTransformInterceptor,
    },
    AppService,
  ],
})
export class AppModule {}
