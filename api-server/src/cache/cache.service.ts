import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Cache } from 'cache-manager';

@Injectable()
export class AppCacheService {
  private readonly logger = new Logger('Cache');

  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  async get<T>(key: string): Promise<T | undefined> {
    const val = await this.cache.get<T | null>(key);
    if (val == null) {
      // null | undefined ⇒ MISS
      this.logger.debug(`MISS key=${key}`);
      return undefined;
    }
    this.logger.debug(`HIT key=${key}`);
    return val as T;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    if (ttl && ttl > 0) await this.cache.set(key, value, ttl);
    else await this.cache.set(key, value);
    this.logger.debug(`SET key=${key} ttl=${ttl ?? 0}s `);
  }

  async del(key: string): Promise<void> {
    await this.cache.del(key);
    this.logger.debug(`DEL key=${key}`);
  }
}
