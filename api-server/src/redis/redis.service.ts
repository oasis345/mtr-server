import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

export enum RedisTTL {
  TICKER_SHORT = 3, // 실시간 티커 (3초)
  ORDERBOOK_SHORT = 5, // 실시간 호가창 (5초)
  MARKET_INFO = 60 * 10, // 마켓 정보는 10분
  DEFAULT = 60, // 일반 캐시는 1분
}

@Injectable()
export class RedisService implements OnModuleInit {
  private client: RedisClientType;

  constructor(
    private readonly configService: ConfigService<{
      REDIS_SECRET: string;
      REDIS_HOST: string;
      REDIS_PORT: string;
    }>,
  ) {
    this.client = createClient({
      username: 'default',
      password: this.configService.get('REDIS_SECRET'),
      socket: {
        host: this.configService.get('REDIS_HOST'),
        port: Number(this.configService.get('REDIS_PORT')),
      },
    });

    this.client.on('error', (err: Error) =>
      console.error('Redis Client Error', err),
    );
  }

  async onModuleInit() {
    try {
      await this.client.connect();
      console.log('redis was connected');
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
    }
  }

  async set(key: string, value: string, ttl?: number) {
    try {
      if (ttl) {
        await this.client.set(key, value, { EX: ttl });
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      console.error('Redis set error:', error);
    }
  }

  async get(key: string) {
    try {
      return await this.client.get(key);
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  async getKeys(pattern: string) {
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      console.error('Redis getKeys error:', error);
      return [];
    }
  }

  async flushAll() {
    await this.client.flushAll();
  }
}
