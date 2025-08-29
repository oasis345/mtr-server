import { BadRequestException, Injectable } from '@nestjs/common';
import { AssetService } from './assets/asset.service';
import { StockService } from './assets/stock/stock.service';
import { Asset, AssetQueryParams, AssetType } from './types';

@Injectable()
export class FinancialService {
  private readonly serviceMap = new Map<AssetType, AssetService>();

  constructor(
    private readonly stockService: StockService,
    // private readonly cryptoService: CryptoService,
  ) {
    this.serviceMap.set(AssetType.STOCK, this.stockService);
    // this.serviceMap.set('crypto', this.cryptoService);
  }

  private prepareService({ assetType }: AssetQueryParams) {
    const service = this.serviceMap.get(assetType);
    if (!service) {
      throw new BadRequestException(`Unsupported asset type: "${assetType}"`);
    }

    return service;
  }

  async getMarketData(params: AssetQueryParams): Promise<Asset[]> {
    const service = this.prepareService(params);

    return await service.getMarketData(params);
  }
}
