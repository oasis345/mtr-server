// src/cache/cache.decorator.ts (핵심 변경만)
import { Logger } from '@nestjs/common';
import type { AppCacheService } from './cache.service';

type MethodContext<MethodArguments extends unknown[], Instance> = {
  args: Readonly<MethodArguments>;
  instance: Instance;
};

export interface CacheableOptions<MethodArguments extends unknown[] = unknown[], Instance = unknown> {
  key: (context: MethodContext<MethodArguments, Instance>) => string;
  ttl: (context: MethodContext<MethodArguments, Instance>) => number;
  when?: (context: MethodContext<MethodArguments, Instance>) => boolean;
  logger?: (instance: Instance) => Pick<Logger, 'debug' | 'log' | 'warn' | 'error'>; // ← 추가
}

export const Cacheable =
  <MethodArguments extends unknown[] = unknown[], Instance = unknown>(
    options: CacheableOptions<MethodArguments, Instance>,
  ): MethodDecorator =>
  (_t, _p, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value as (this: Instance, ...a: MethodArguments) => Promise<unknown>;

    descriptor.value = async function (...rawArguments: unknown[]) {
      const instance = this as Instance;
      const methodArguments = rawArguments as MethodArguments;
      const methodContext = { args: methodArguments, instance };

      const shouldUseCache = options.when ? options.when(methodContext) : true;
      if (!shouldUseCache) return Reflect.apply(originalMethod, instance, methodArguments);

      const cacheKey = options.key(methodContext);
      const ttlSeconds = Math.max(0, Number(options.ttl(methodContext) || 0));
      if (!cacheKey) return Reflect.apply(originalMethod, instance, methodArguments);

      const cacheService =
        typeof instance === 'object' && instance && 'cacheService' in (instance as any)
          ? ((instance as any).cacheService as AppCacheService)
          : undefined;
      if (!cacheService) return Reflect.apply(originalMethod, instance, methodArguments);

      const cachedValue = await cacheService.get<unknown>(cacheKey);
      if (cachedValue !== undefined) return cachedValue;

      const resultValue = await Reflect.apply(originalMethod, instance, methodArguments);
      if (ttlSeconds > 0) await cacheService.set(cacheKey, resultValue, ttlSeconds);
      return resultValue;
    };

    return descriptor;
  };
