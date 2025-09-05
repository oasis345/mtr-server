import Alpaca from '@alpacahq/alpaca-trade-api';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AlpacaClient implements OnModuleDestroy {
  private readonly logger = new Logger(AlpacaClient.name);
  private readonly alpaca: Alpaca;

  constructor(private readonly configService: ConfigService) {
    const keyId = this.configService.get<string>('ALPACA_API_KEY');
    const secretKey = this.configService.get<string>('ALPACA_SECRET_KEY');

    if (!keyId || !secretKey) {
      throw new Error('Alpaca API Key and Secret Key must be configured in .env file.');
    }

    this.alpaca = new Alpaca({
      keyId: keyId,
      secretKey: secretKey,
      feed: 'iex', // 무료 플랜은 IEX 거래소 데이터만 사용 가능
      paper: true, // 가상 매매 계정 사용
    });
  }

  /**
   * 주식 데이터 웹소켓 스트림 객체를 반환합니다.
   */
  get stockStream() {
    return this.alpaca.data_ws;
  }

  /**
   * 암호화폐 데이터 웹소켓 스트림 객체를 반환합니다. (향후 확장용)
   */
  get cryptoStream() {
    return this.alpaca.crypto_stream_v1beta3;
  }

  /**
   * 애플리케이션이 종료될 때, 열려있는 모든 WebSocket 연결을 안전하게 닫습니다.
   */
  onModuleDestroy() {
    this.logger.log('Disconnecting Alpaca streams...');
    this.stockStream?.disconnect();
    this.cryptoStream?.disconnect();
  }
}
