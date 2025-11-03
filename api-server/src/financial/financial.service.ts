import { Asset, AssetType, Trade } from '@/common/types/asset.types';
import { BadRequestException, Injectable } from '@nestjs/common';
import { AssetService } from './assets/asset.service';
import { CryptoService } from './assets/crypto/crypto.service';
import { StockService } from './assets/stock/stock.service';
import { AssetQueryParams, CandleQueryParams, CandleResponse } from './types';

@Injectable()
export class FinancialService {
  private readonly serviceMap = new Map<AssetType, AssetService>();

  constructor(
    private readonly stockService: StockService,
    private readonly cryptoService: CryptoService,
  ) {
    this.serviceMap.set(AssetType.STOCK, this.stockService);
    this.serviceMap.set(AssetType.CRYPTO, this.cryptoService);
  }

  prepareParams(params: AssetQueryParams): AssetQueryParams {
    const symbols = this.normalizeSymbols(params.symbols);
    return { ...params, symbols };
  }

  async getMarketData(params: AssetQueryParams): Promise<Asset[]> {
    const service = this.prepareService(params);
    return await service.getMarketData(params);
  }

  async getCandles(params: CandleQueryParams): Promise<CandleResponse> {
    const service = this.prepareService(params);
    return await service.getCandles(params);
  }

  async getTrades(params: AssetQueryParams): Promise<Trade[]> {
    const service = this.prepareService(params);
    return await service.getTrades(params);
  }

  private prepareService({ assetType }: AssetQueryParams) {
    const service = this.serviceMap.get(assetType);
    if (!service) {
      throw new BadRequestException(`Unsupported asset type: "${assetType}"`);
    }

    return service;
  }

  private normalizeSymbols(input?: string | string[]): string[] {
    const items = Array.isArray(input) ? input : input ? [input] : [];
    const normalized = items
      .flatMap(s => s.split(',')) // 콤마 분리
      .map(s => s.trim().toUpperCase()) // 트림 + 대문자
      .filter(Boolean);

    return Array.from(new Set(normalized)).sort(); // 중복 제거 + 정렬
  }
}
