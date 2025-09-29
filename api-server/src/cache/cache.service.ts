import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Cache } from 'cache-manager';

@Injectable()
export class AppCacheService {
  private readonly logger = new Logger('Cache');

  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  async get<T>(key: string): Promise<T | undefined> {
    const t0 = Date.now();
    const value = await this.cache.get<T>(key);
    if (value !== undefined) this.logger.debug(`HIT key=${key}`);
    else this.logger.debug(`MISS key=${key}`);
    return value;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const t0 = Date.now();
    if (ttl && ttl > 0) await this.cache.set(key, value, ttl);
    else await this.cache.set(key, value);
    this.logger.debug(`SET key=${key} ttl=${ttl ?? 0}s time=${Date.now() - t0}ms`);
  }

  async del(key: string): Promise<void> {
    await this.cache.del(key);
    this.logger.debug(`DEL key=${key}`);
  }
}
