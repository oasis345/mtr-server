import { Asset, AssetType, Trade } from '@/common/types/asset.types';
import { BadRequestException, Injectable } from '@nestjs/common';
import { AssetService } from './assets/asset.service';
import { CryptoService } from './assets/crypto/crypto.service';
import { StockService } from './assets/stock/stock.service';
import {
  AssetQueryParams,
  CandleQueryParams,
  CandleResponse,
  EnableExchangeStockCountry,
  ExchangeRate,
  StockMarketStatus,
} from './types';
import { checkMarketStatus } from './utils/stockMarketChecker';
import { dayjs } from '@/common/utils/dayjs';
import { CustomHttpService } from '@/common/http/http.service';

@Injectable()
export class FinancialService {
  private readonly serviceMap = new Map<AssetType, AssetService>();

  constructor(
    private readonly stockService: StockService,
    private readonly cryptoService: CryptoService,
    private readonly httpService: CustomHttpService,
  ) {
    this.serviceMap.set(AssetType.STOCK, this.stockService);
    this.serviceMap.set(AssetType.CRYPTO, this.cryptoService);
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

  getStockMarketStatus(country: EnableExchangeStockCountry): StockMarketStatus {
    const result = checkMarketStatus(country, dayjs(new Date()));
    return result;
  }

  async getExchangeRate(): Promise<ExchangeRate> {
    const url =
      'https://m.search.naver.com/p/csearch/content/qapirender.nhn?key=calculator&pkid=141&q=%ED%99%98%EC%9C%A8&where=m&u1=keb&u6=standardUnit&u7=0&u3=USD&u4=KRW&u8=down&u2=1';
    const response: any = await this.httpService.get(url);
    const usd = Number(response?.country[0].value);
    const krw = parseFloat(response?.country[1].value.replace(/,/g, ''));

    try {
      const exchageRate: ExchangeRate = {
        usd,
        krw,
        timestamp: new Date().toISOString(),
      };
      return exchageRate;
    } catch (error) {
      throw new BadRequestException('Failed to fetch Exchange rate');
    }
  }

  private prepareService({ assetType }: AssetQueryParams) {
    const service = this.serviceMap.get(assetType);
    if (!service) {
      throw new BadRequestException(`Unsupported asset type: "${assetType}"`);
    }

    return service;
  }
}
