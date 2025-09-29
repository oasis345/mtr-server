import { AppCacheService } from '@/cache/cache.service';
import { AssetType } from '@/common/types/asset.types';
import { ProviderRegistry } from '@/financial/providers/provider.registry';
import { Injectable } from '@nestjs/common';
import { AssetServiceConfig } from '../../config/assetConfig';
import { AssetService } from '../asset.service';

@Injectable()
export class CryptoService extends AssetService {
  protected readonly assetType = AssetType.CRYPTO;

  constructor(registry: ProviderRegistry, cacheService: AppCacheService, config: AssetServiceConfig) {
    super(registry, cacheService, config); // 👈 logoService 자리에 null 전달
  }
}
