import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { UserController } from '@/user/user.controller';
import { UserService } from '@/user/user.service';
import { UserModule } from '@/user/user.module';
import { AuthModule } from '@/auth/auth.module';
import { APP_FILTER } from '@nestjs/core';
import { HttpExceptionFilter } from '@/common/filters/http-exception.filter';
import { PrismaModule } from 'database/prisma.module';
import { RedisService } from '@/redis/redis.service';
import { UpbitService } from '@/market/upbit/upbit.service';
import { GatewayModule } from '@/gateway/gateway.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    UserModule,
    AuthModule,
    ConfigModule,
    PrismaModule,
    GatewayModule,
  ],
  controllers: [AppController, UserController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    AppService,
    UserService,
    RedisService,
    UpbitService,
  ],
})
export class AppModule {}
