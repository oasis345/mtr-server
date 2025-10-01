import { Injectable, Logger } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { MarketDataType } from '../types';
import { AssetService } from './asset.service';

@Injectable()
export class AssetCacheOrchestrator {
  private readonly logger = new Logger(AssetCacheOrchestrator.name);
  constructor(private readonly schedulerRegistry: SchedulerRegistry) {}

  init(service: AssetService) {
    void this.warmup(service);
    this.registerCronJobs(service);
  }

  private async warmup(service: AssetService) {
    const order = Array.from(service['config'].cacheableDataTypeMap.entries())
      .filter(([, cfg]) => cfg?.warmup !== false)
      .map(([dataType]) => dataType);

    if (order.length === 0) return;
    this.logger.debug(`[${service['assetType']}] warmup: [${order.join(', ')}]`);
    for (const dataType of order) {
      try {
        await service.refreshCache(dataType);
        this.logger.log(`[${service['assetType']}] warmed: ${dataType}`);
      } catch {
        this.logger.error(`[${service['assetType']}] warmup failed: ${dataType}`);
      }
    }
  }

  private registerCronJobs(service: AssetService) {
    const buckets = new Map<string, MarketDataType[]>();
    for (const [dataType, cfg] of service['config'].cacheableDataTypeMap.entries()) {
      if (!cfg.refreshInterval) continue;
      if (!buckets.has(cfg.refreshInterval)) buckets.set(cfg.refreshInterval, []);
      buckets.get(cfg.refreshInterval).push(dataType);
    }

    for (const [cronExpr, types] of buckets.entries()) {
      const jobName = `${service['assetType']}_${cronExpr}_refresh`;
      if (this.schedulerRegistry.doesExist('cron', jobName)) continue;

      const job = new CronJob(cronExpr, async () => {
        const ordered = Array.from(service['config'].cacheableDataTypeMap.keys()).filter(t => types.includes(t));
        this.logger.debug(`[Cron] ${jobName} → ${ordered.join(', ')}`);
        for (const t of ordered) {
          try {
            await service.refreshCache(t);
          } catch {
            this.logger.error(`[Cron] ${jobName} failed: ${t}`);
          }
        }
      });

      this.schedulerRegistry.addCronJob(jobName, job);
      job.start();
      this.logger.log(`Registered "${jobName}" @ "${cronExpr}" for [${types.join(', ')}]`);
    }
  }
}
