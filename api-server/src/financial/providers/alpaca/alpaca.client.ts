import { CustomHttpService } from '@/common/http/http.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AlpacaClient {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://data.alpaca.markets/v1';

  constructor(
    private readonly httpService: CustomHttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get('ALPACA_API_KEY');
    if (!this.apiKey) {
      throw new Error('ALPACA_API_KEY is not configured');
    }
  }

  /**
   * FMP API로 GET 요청을 보냅니다.
   * @param endpoint API 엔드포인트 (예: 'stock-screener')
   * @param params URL 쿼리 파라미터
   */
  async get<T>(endpoint: string, params: URLSearchParams = new URLSearchParams()): Promise<T> {
    params.set('apikey', this.apiKey);
    const url = `${this.baseUrl}/${endpoint}?${params.toString()}`;
    return this.httpService.get<T>(url);
  }
}
