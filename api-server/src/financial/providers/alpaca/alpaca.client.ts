import { CustomHttpService } from '@/common/http/http.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

enum BaseUrl {
  MARKET = 'https://data.alpaca.markets',
  ASSET = 'https://paper-api.alpaca.markets',
}

@Injectable()
export class AlpacaClient {
  private readonly headers: Record<string, string>;

  constructor(
    private readonly httpService: CustomHttpService,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('ALPACA_API_KEY');
    const secretKey = this.configService.get<string>('ALPACA_SECRET_KEY');

    if (!apiKey || !secretKey) {
      throw new Error('ALPACA API KEY and/or SECRET KEY are not configured in .env');
    }

    this.headers = {
      'APCA-API-KEY-ID': apiKey,
      'APCA-API-SECRET-KEY': secretKey,
      accept: 'application/json',
    };
  }

  /**
   * [수정] Base URL을 동적으로 선택할 수 있도록 오버로딩된 get 메서드
   *
   * @param path API 경로 (예: 'v2/assets', 'v1beta1/screener/stocks/most-actives')
   * @param params URL 쿼리 파라미터 (선택적)
   * @param baseUrlType Base URL 타입 (기본값: MARKET)
   */
  async get<T>(
    path: string,
    params: URLSearchParams = new URLSearchParams(),
    baseUrlType: keyof typeof BaseUrl = 'MARKET',
  ): Promise<T> {
    const baseUrl = BaseUrl[baseUrlType];
    const url = `${baseUrl}/${path}`;

    return this.httpService.get<T>(url, {
      headers: this.headers,
      params,
    });
  }

  /**
   * [편의 메서드] Market Data API 호출 (기존 호환성 유지)
   */
  async getMarketData<T>(path: string, params?: URLSearchParams): Promise<T> {
    return this.get<T>(path, params, 'MARKET');
  }

  /**
   * [편의 메서드] Assets API 호출
   */
  async getAssets<T>(path: string, params?: URLSearchParams): Promise<T> {
    return this.get<T>(path, params, 'ASSET');
  }
}
