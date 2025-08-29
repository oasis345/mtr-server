import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { AuthModule } from '@/auth/auth.module';
import { HttpExceptionFilter } from '@/common/filters/http-exception.filter';
import { UserModule } from '@/user/user.module';
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { redisStore } from 'cache-manager-redis-store';
import { PrismaModule } from 'database/prisma.module';
import { createClient } from 'redis';
import { FinancialModule } from './financial/financial.module';
// import { UpbitService } from '@/market/upbit/upbit.service';
// import { GatewayModule } from '@/gateway/gateway.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    UserModule,
    AuthModule,
    FinancialModule,
    ScheduleModule.forRoot(),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const host = configService.get<string>('REDIS_HOST');
        const port = configService.get<number>('REDIS_PORT');
        const username = configService.get<string>('REDIS_USERNAME');
        const password = configService.get<string>('REDIS_PASSWORD');

        if (!host || !port || !password) {
          throw new Error('Redis connection information is missing');
        }

        // 2. 연결 테스트를 위한 임시 클라이언트를 생성합니다.
        const client = createClient({
          socket: { host, port },
          username,
          password,
        });

        try {
          // 3. 연결 및 PING 테스트를 수행합니다.
          await client.connect();
          await client.ping();
          console.log('✅ Redis connection test successful!');
        } catch (error) {
          // 4. 연결 실패 시, 명확한 에러를 던져 앱 시작을 중단시킵니다.
          console.error('🔴 Failed to connect to Redis:', error);
          throw new Error('Could not connect to Redis. Please check your connection details.');
        } finally {
          // 5. 테스트가 끝나면 임시 클라이언트의 연결을 반드시 끊습니다.
          await client.quit();
        }

        // 6. 연결 테스트에 성공했으면, cache-manager가 사용할 store를 생성하여 반환합니다.
        const store = await redisStore({
          socket: { host, port },
          username,
          password,
          ttl: 60,
        });

        return {
          store: store,
        };
      },
    }),
    // GatewayModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    AppService,
    // UpbitService,
  ],
})
export class AppModule {}
