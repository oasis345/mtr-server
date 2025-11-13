import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Cache } from 'cache-manager';

@Injectable()
export class AppCacheService {
  private readonly logger = new Logger('Cache');

  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  async get<T>(key: string, source?: string): Promise<T | undefined> {
    const val = await this.cache.get<T | null>(key);
    const hit = val != null;
    this.logger.debug(`${hit ? 'HIT' : 'MISS'} key=${key}${source ? ` source=${source}` : ''}`);
    return hit ? (val as T) : undefined;
  }

  async set<T>(key: string, value: T, ttl?: number, source?: string): Promise<void> {
    // @ts-ignore
    if (ttl && ttl > 0) await this.cache.set(key, value, { ttl: ttl });
    else await this.cache.set(key, value);
    this.logger.debug(`SET key=${key} ttl=${ttl ?? 0}s${source ? ` source=${source}` : ''}`);
  }

  async del(key: string, source?: string): Promise<void> {
    await this.cache.del(key);
    this.logger.debug(`DEL key=${key}${source ? ` source=${source}` : ''}`);
  }
}
