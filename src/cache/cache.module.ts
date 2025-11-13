import { CacheModule } from '@nestjs/cache-manager';
import { Global, Module } from '@nestjs/common';
import * as redisStore from 'cache-manager-redis-store';
import { AppCacheService } from './cache.service';

// Create a custom Redis store with the prefix
const redisStoreWithPrefix = {
  create: () => {
    return redisStore.create({
      host: process.env.REDIS_HOST,
      port: +process.env.REDIS_PORT,
      username: process.env.REDIS_USERNAME,
      password: process.env.REDIS_PASSWORD,
      db: 0,
    });
  },
};

@Global()
@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
      store: redisStoreWithPrefix,
    }),
  ],
  providers: [AppCacheService],
  exports: [AppCacheService],
})
export default class AppCacheModule {}
