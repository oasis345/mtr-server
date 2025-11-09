import { CustomHttpService } from '@/common/http/http.service';
import { ConfigService } from '@nestjs/config';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ChannelDataType, MarketStreamData, MarketStreamProvider } from '@/gateway/market/types';
import { AssetType, ChartTimeframe } from '@/common/types';
import { Observable, Subject } from 'rxjs';
import { KisStreamClient } from '@/gateway/market/providers/koreaInvestment/kis.stream.client';
import { checkMarketStatus } from '@/financial/utils/stockMarketChecker';
import { dayjs } from '@/common/utils/dayjs';

const DEFAULT_SEND_DELAY_MS = 100;

@Injectable()
export class KoreaInvestmentStockStreamProvider implements MarketStreamProvider, OnModuleInit {
  public assetType = AssetType.STOCK;
  private streamClient: KisStreamClient;
  private dataStream = new Subject<MarketStreamData>();

  constructor(
    private readonly httpService: CustomHttpService,
    private readonly configService: ConfigService,
  ) {
    this.streamClient = new KisStreamClient(this.httpService, this.configService);
  }

  async onModuleInit() {
    await this.streamClient.connect();
    const rawMessageStream$ = this.streamClient.getMessageStream();

    rawMessageStream$.subscribe(message => {
      console.log(message);
    });
  }

  async subscribe(symbols: string[], dataTypes: ChannelDataType[], timeframe?: ChartTimeframe): Promise<void> {
    const requestSymbols = symbols.map(symbol => this.createTickerKey(symbol));

    for (const requestSymbol of requestSymbols) {
      const message = {
        header: {
          approval_key: this.streamClient.APPROVAL_KEY,
          tr_type: '1', // 등록
          custtype: 'P',
          'content-type': 'utf-8',
        },
        body: {
          input: {
            tr_id: 'HDFSCNT0', // 실시간 주식 현재가
            tr_key: requestSymbol,
          },
        },
      };

      this.streamClient.send(JSON.stringify(message));
      await new Promise(resolve => setTimeout(resolve, DEFAULT_SEND_DELAY_MS)); // 메시지 전송 간 지연
    }
  }

  async unsubscribe(symbols: string[], dataTypes: ChannelDataType[], timeframe?: ChartTimeframe): Promise<void> {
    const requestSymbols = symbols.map(symbol => this.createTickerKey(symbol));
    for (const requestSymbol of requestSymbols) {
      const message = {
        header: {
          approval_key: this.streamClient.APPROVAL_KEY,
          tr_type: '2', // 해지
          custtype: 'P',
          'content-type': 'utf-8',
        },
        body: {
          input: {
            // tr_id와 tr_key를 input 객체 내부로 이동
            tr_id: 'HDFSCNT0', // 실시간 주식 현재가
            tr_key: requestSymbol,
          },
        },
      };

      this.streamClient.send(JSON.stringify(message));
      await new Promise(resolve => setTimeout(resolve, DEFAULT_SEND_DELAY_MS)); // 메시지 전송 간 지연
    }
  }

  getDataStream(): Observable<MarketStreamData> {
    return this.dataStream.asObservable();
  }

  /**
   * 컴포짓키를 바탕으로 소켓 request key를 반환.
   * @param {symbol} string - 'NAS:APPL 형식의 컴포짓 키'
   * @returns {tr_key}: string - 예) DNASAAPL : D+NAS(나스닥)+AAPL(애플)
   */
  createTickerKey(symbol: string): string {
    const marketStatus = checkMarketStatus('US', dayjs(new Date()));
    const ticker = symbol.replace(':', '');
    return `${marketStatus === 'REGULAR' ? 'R' : 'D'}${ticker}`;
  }
}
