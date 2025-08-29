import Alpaca from '@alpacahq/alpaca-trade-api';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AlpacaClient implements OnModuleDestroy {
  private readonly logger = new Logger(AlpacaClient.name);
  private alpacaClient: Alpaca;

  constructor(private readonly configService: ConfigService) {
    const keyId = this.configService.get<string>('ALPACA_API_KEY');
    const secretKey = this.configService.get<string>('ALPACA_SECRET_KEY');

    if (!keyId || !secretKey) {
      throw new Error('Alpaca API Key and Secret Key must be configured in .env file.');
    }

    this.alpacaClient = new Alpaca({
      keyId: keyId,
      secretKey: secretKey,
      feed: 'iex', // 무료 플랜에서 사용할 수 있는 IEX 거래소 데이터를 의미합니다.
      paper: true, // true: 가상 매매, false: 실거래
    });
  }

  get stockStream() {
    return this.alpacaClient.data_ws;
  }

  /**
   * 애플리케이션이 종료될 때, 열려있는 모든 WebSocket 연결을 안전하게 닫습니다.
   */
  onModuleDestroy() {
    this.logger.log('Disconnecting Alpaca streams...');
    this.stockStream?.disconnect();
  }
}
